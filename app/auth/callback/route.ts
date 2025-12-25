import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getRedirectBaseUrl } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Use request origin to ensure we redirect to the same host the user is accessing
  // This works for both localhost and production
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
  
  console.log("Auth callback: baseUrl =", baseUrl);

  if (!code) {
    console.error("Auth callback: No code parameter found");
    return NextResponse.redirect(
      `${baseUrl}/login?error=auth_callback_error&message=${encodeURIComponent("No authentication code provided. Please try again.")}`
    );
  }

  // Create a temporary response for cookie handling during auth exchange
  // We'll create the final redirect response after we know where to redirect
  const tempResponse = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set cookies on the temp response - these will be copied to final response
          tempResponse.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // Remove cookies from the temp response
          tempResponse.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  try {
    console.log("Auth callback: Exchanging code for session...");
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(
        `${baseUrl}/login?error=auth_callback_error&message=${encodeURIComponent(error.message || "Authentication failed. Please try again.")}`
      );
    }

    if (!data.session) {
      console.error("Auth callback: No session created");
      return NextResponse.redirect(
        `${baseUrl}/login?error=auth_callback_error&message=${encodeURIComponent("Session creation failed. Please try again.")}`
      );
    }

    if (!data.user) {
      console.error("Auth callback: No user in session");
      return NextResponse.redirect(
        `${baseUrl}/login?error=auth_callback_error&message=${encodeURIComponent("User authentication failed. Please try again.")}`
      );
    }

    console.log("Auth callback: Session created successfully for user:", data.user.id);

    // Determine redirect URL based on the flow (login vs registration)
    let redirectUrl: string;
    if (next === "/register") {
      // User is coming from REGISTRATION flow - check if they already have a profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (profile) {
        // User already has a profile - redirect to dashboard
        redirectUrl = `${baseUrl}/dashboard`;
      } else {
        // Check for quiz answers in URL parameters
        const quizParam = requestUrl.searchParams.get("quiz");
        
        if (quizParam) {
          // Decode and parse quiz answers
          try {
            const decodedAnswers = JSON.parse(atob(decodeURIComponent(quizParam)));
            
            // Create profile immediately using admin client
            const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
            const adminSupabase = getSupabaseAdmin();
            
            // Prepare profile data
            const profileData: {
              user_id: string;
              name?: string | null;
              top_problems?: string[];
              severity?: string | null;
              timing?: string | null;
              tried_options?: string[];
              doctor_status?: string | null;
              goal?: string | null;
            } = {
              user_id: data.user.id,
            };
            
            if (decodedAnswers.name !== undefined) {
              profileData.name = decodedAnswers.name || null;
            }
            if (decodedAnswers.top_problems !== undefined) {
              profileData.top_problems = decodedAnswers.top_problems;
            }
            if (decodedAnswers.severity !== undefined) {
              profileData.severity = decodedAnswers.severity || null;
            }
            if (decodedAnswers.timing !== undefined) {
              profileData.timing = decodedAnswers.timing || null;
            }
            if (decodedAnswers.tried_options !== undefined) {
              profileData.tried_options = decodedAnswers.tried_options;
            }
            if (decodedAnswers.doctor_status !== undefined) {
              profileData.doctor_status = decodedAnswers.doctor_status || null;
            }
            if (decodedAnswers.goal !== undefined) {
              // Handle both array and string for backward compatibility
              if (Array.isArray(decodedAnswers.goal)) {
                // Store as JSON string for multiple goals
                profileData.goal = JSON.stringify(decodedAnswers.goal);
              } else {
                profileData.goal = decodedAnswers.goal || null;
              }
            }
            
            // Insert profile
            const { error: profileError } = await adminSupabase
              .from("user_profiles")
              .insert([profileData]);
            
            if (profileError) {
              console.error("Error creating profile in auth callback:", profileError);
              // If profile creation fails, redirect to register page to try again
              redirectUrl = `${baseUrl}/register`;
            } else {
              console.log("Profile created successfully in auth callback");
              // Profile created - redirect to dashboard
              redirectUrl = `${baseUrl}/dashboard`;
            }
          } catch (parseError) {
            console.error("Error parsing quiz answers:", parseError);
            // If parsing fails, redirect to register page
            redirectUrl = `${baseUrl}/register`;
          }
        } else {
          // No quiz answers - redirect to register page to complete quiz
          redirectUrl = `${baseUrl}/register`;
        }
      }
    } else {
      // User is coming from LOGIN flow - always redirect to dashboard (or the specified next target)
      const sanitizedNext = next.startsWith("/") ? next : "/dashboard";
      redirectUrl = `${baseUrl}${sanitizedNext}`;
    }

    console.log("Auth callback: Redirecting to:", redirectUrl);

    // Create the final redirect response
    const finalResponse = NextResponse.redirect(redirectUrl);
    
    // Copy all cookies from the temp response to the final response
    // This ensures the session cookies set by exchangeCodeForSession are preserved
    tempResponse.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path || "/",
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure ?? (process.env.NODE_ENV === "production"),
        sameSite: (cookie.sameSite as "lax" | "strict" | "none" | undefined) ?? "lax",
      });
    });

    console.log("Auth callback: Cookies copied, returning response");
    return finalResponse;
  } catch (error) {
    console.error("Auth callback exception:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
    return NextResponse.redirect(
      `${baseUrl}/login?error=auth_callback_error&message=${encodeURIComponent(errorMessage)}`
    );
  }
}

