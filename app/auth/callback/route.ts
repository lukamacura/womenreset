import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

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
          // Set cookies on the temp response with proper SameSite and Secure flags
          // This helps with cross-browser scenarios (though cookies are still browser-specific)
          const isProduction = process.env.NODE_ENV === "production";
          const isHttps = requestUrl.protocol === "https:";
          
          // For Samsung Internet and other browsers, use appropriate SameSite settings
          // SameSite=None requires Secure=true and HTTPS
          const sameSiteValue = isHttps && isProduction 
            ? (options.sameSite as "none" | "lax" | "strict" | undefined) ?? "none"
            : (options.sameSite as "lax" | "strict" | "none" | undefined) ?? "lax";
          
          const secureValue = sameSiteValue === "none" ? true : (options.secure ?? isProduction);
          
          tempResponse.cookies.set({
            name,
            value,
            ...options,
            sameSite: sameSiteValue,
            secure: secureValue,
            httpOnly: options.httpOnly ?? true,
            // Ensure path is set correctly
            path: options.path || "/",
          });
        },
        remove(name: string, options: CookieOptions) {
          // Remove cookies from the temp response
          tempResponse.cookies.set({
            name,
            value: "",
            ...options,
            path: options.path || "/",
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
    
    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("user_id, name, top_problems, severity, timing, tried_options, doctor_status, goal")
      .eq("user_id", data.user.id)
      .maybeSingle();

    // Check for quiz answers in URL parameters (for registration flow)
    const quizParam = requestUrl.searchParams.get("quiz");
    
    if (existingProfile && quizParam && next === "/register") {
      // Profile exists but we have quiz answers - update it with quiz data
      console.log("Auth callback: Profile exists but quiz answers provided, updating profile");
      
      try {
        const decodedAnswers = JSON.parse(atob(decodeURIComponent(quizParam)));
        const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
        const adminSupabase = getSupabaseAdmin();
        
        // Prepare update data
        const updateData: {
          name?: string | null;
          top_problems?: string[];
          severity?: string | null;
          timing?: string | null;
          tried_options?: string[];
          doctor_status?: string | null;
          goal?: string | null;
        } = {};
        
        if (decodedAnswers.name !== undefined && decodedAnswers.name !== null) {
          updateData.name = String(decodedAnswers.name).trim() || null;
        }
        if (decodedAnswers.top_problems !== undefined && Array.isArray(decodedAnswers.top_problems) && decodedAnswers.top_problems.length > 0) {
          updateData.top_problems = decodedAnswers.top_problems;
        }
        if (decodedAnswers.severity !== undefined && decodedAnswers.severity !== null) {
          updateData.severity = String(decodedAnswers.severity);
        }
        if (decodedAnswers.timing !== undefined && decodedAnswers.timing !== null) {
          updateData.timing = String(decodedAnswers.timing);
        }
        if (decodedAnswers.tried_options !== undefined && Array.isArray(decodedAnswers.tried_options) && decodedAnswers.tried_options.length > 0) {
          updateData.tried_options = decodedAnswers.tried_options;
        }
        if (decodedAnswers.doctor_status !== undefined && decodedAnswers.doctor_status !== null) {
          updateData.doctor_status = String(decodedAnswers.doctor_status);
        }
        if (decodedAnswers.goal !== undefined) {
          if (Array.isArray(decodedAnswers.goal) && decodedAnswers.goal.length > 0) {
            updateData.goal = String(decodedAnswers.goal[0]);
          } else if (decodedAnswers.goal !== null) {
            updateData.goal = String(decodedAnswers.goal);
          }
        }
        
        const { error: updateError } = await adminSupabase
          .from("user_profiles")
          .update(updateData)
          .eq("user_id", data.user.id);
        
        if (updateError) {
          console.error("Error updating profile with quiz answers:", updateError);
        } else {
          console.log("Profile updated successfully with quiz answers");
        }
      } catch (updateError) {
        console.error("Error updating existing profile:", updateError);
      }
      
      redirectUrl = `${baseUrl}/dashboard`;
    } else if (existingProfile) {
      // User already has a profile - always redirect to dashboard
      console.log("Auth callback: Profile already exists, redirecting to dashboard");
      redirectUrl = `${baseUrl}/dashboard`;
    } else if (next === "/register") {
      // User is coming from REGISTRATION flow - check for quiz answers in URL parameters
      const quizParam = requestUrl.searchParams.get("quiz");
      
      if (quizParam) {
        // Decode and parse quiz answers
        try {
          const decodedAnswers = JSON.parse(atob(decodeURIComponent(quizParam)));
          
          console.log("Auth callback: Parsed quiz answers:", {
            hasName: decodedAnswers.name !== undefined,
            hasTopProblems: decodedAnswers.top_problems !== undefined,
            hasSeverity: decodedAnswers.severity !== undefined,
            hasTiming: decodedAnswers.timing !== undefined,
            hasTriedOptions: decodedAnswers.tried_options !== undefined,
            hasDoctorStatus: decodedAnswers.doctor_status !== undefined,
            hasGoal: decodedAnswers.goal !== undefined,
          });
          
          // Create profile immediately using admin client
          const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
          const adminSupabase = getSupabaseAdmin();
          
          // Prepare profile data - ensure ALL fields are included
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
          
          // Store all quiz answers - ensure every field is captured
          if (decodedAnswers.name !== undefined && decodedAnswers.name !== null) {
            profileData.name = String(decodedAnswers.name).trim() || null;
          }
          
          if (decodedAnswers.top_problems !== undefined) {
            if (Array.isArray(decodedAnswers.top_problems) && decodedAnswers.top_problems.length > 0) {
              profileData.top_problems = decodedAnswers.top_problems;
            }
          }
          
          if (decodedAnswers.severity !== undefined && decodedAnswers.severity !== null) {
            profileData.severity = String(decodedAnswers.severity);
          }
          
          if (decodedAnswers.timing !== undefined && decodedAnswers.timing !== null) {
            profileData.timing = String(decodedAnswers.timing);
          }
          
          if (decodedAnswers.tried_options !== undefined) {
            if (Array.isArray(decodedAnswers.tried_options) && decodedAnswers.tried_options.length > 0) {
              profileData.tried_options = decodedAnswers.tried_options;
            }
          }
          
          if (decodedAnswers.doctor_status !== undefined && decodedAnswers.doctor_status !== null) {
            profileData.doctor_status = String(decodedAnswers.doctor_status);
          }
          
          if (decodedAnswers.goal !== undefined) {
            // Handle both array and string for backward compatibility
            // Note: The database CHECK constraint only allows single values, so we store the first goal
            if (Array.isArray(decodedAnswers.goal) && decodedAnswers.goal.length > 0) {
              // Store the first goal (database constraint only allows single values)
              profileData.goal = String(decodedAnswers.goal[0]);
            } else if (decodedAnswers.goal !== null) {
              profileData.goal = String(decodedAnswers.goal);
            }
          }
          
          console.log("Auth callback: Profile data to insert:", {
            user_id: profileData.user_id,
            name: profileData.name,
            top_problems: profileData.top_problems,
            severity: profileData.severity,
            timing: profileData.timing,
            tried_options: profileData.tried_options,
            doctor_status: profileData.doctor_status,
            goal: profileData.goal,
          });
          
          // Insert profile
          const { error: profileError, data: insertedProfile } = await adminSupabase
            .from("user_profiles")
            .insert([profileData])
            .select();
          
          if (profileError) {
            console.error("Error creating profile in auth callback:", profileError);
            console.error("Profile error details:", {
              code: profileError.code,
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint,
            });
            console.error("Profile data that failed to insert:", JSON.stringify(profileData, null, 2));
            
            // Try to use the intake API as a fallback
            try {
              console.log("Attempting fallback: calling /api/intake to save quiz answers");
              const { user_id: _userId, ...profileDataWithoutUserId } = profileData;
              const intakeResponse = await fetch(`${baseUrl}/api/intake`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  user_id: data.user.id,
                  ...profileDataWithoutUserId,
                }),
              });
              
              if (intakeResponse.ok) {
                console.log("Successfully saved quiz answers via /api/intake fallback");
              } else {
                const intakeError = await intakeResponse.json();
                console.error("Intake API also failed:", intakeError);
              }
            } catch (fallbackError) {
              console.error("Fallback to intake API also failed:", fallbackError);
            }
            
            // Still redirect to dashboard (user can complete quiz there)
            redirectUrl = `${baseUrl}/dashboard`;
          } else {
            console.log("Profile created successfully in auth callback:", insertedProfile);
            // Profile created - redirect to dashboard
            redirectUrl = `${baseUrl}/dashboard`;
          }
        } catch (parseError) {
          console.error("Error parsing quiz answers:", parseError);
          // If parsing fails, redirect to dashboard (user can complete quiz there)
          redirectUrl = `${baseUrl}/dashboard`;
        }
      } else {
        // No quiz answers - redirect to dashboard (user can complete quiz there if needed)
        console.log("Auth callback: No quiz answers found, redirecting to dashboard");
        redirectUrl = `${baseUrl}/dashboard`;
      }
    } else {
      // User is coming from LOGIN flow - always redirect to dashboard (or the specified next target)
      const sanitizedNext = next.startsWith("/") ? next : "/dashboard";
      redirectUrl = `${baseUrl}${sanitizedNext}`;
    }

    // For Samsung Internet and cross-browser compatibility, pass session tokens in URL hash
    // Hash fragments are client-side only (not sent to server), making them more secure
    // This allows session restoration even when cookies aren't shared between browsers
    const userAgent = request.headers.get("user-agent") || "";
    const isAndroid = /android/i.test(userAgent);
    const isSamsungBrowser = /SamsungBrowser/i.test(userAgent);
    
    // Always add session tokens in hash for cross-browser compatibility (especially Samsung Internet)
    // This is a fallback mechanism that works even if cookies fail
    if (data.session) {
      const url = new URL(redirectUrl);
      
      // Add session tokens as hash fragment (secure, client-side only)
      // Format: #access_token=...&refresh_token=...&expires_at=...
      const hashParams = new URLSearchParams({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at?.toString() || "",
        expires_in: data.session.expires_in?.toString() || "",
      });
      
      url.hash = hashParams.toString();
      redirectUrl = url.toString();
      
      if (isAndroid && isSamsungBrowser) {
        console.log("Auth callback: Added session tokens to URL hash for Samsung Internet compatibility");
        // Also add browser_check param for monitoring
        url.searchParams.set("browser_check", "samsung");
        redirectUrl = url.toString();
      } else {
        console.log("Auth callback: Added session tokens to URL hash for cross-browser compatibility");
      }
    }

    console.log("Auth callback: Redirecting to:", redirectUrl.replace(/#.*/, "#***")); // Hide tokens in logs

    // Create the final redirect response
    const finalResponse = NextResponse.redirect(redirectUrl);
    
    // Copy all cookies from the temp response to the final response
    // This ensures the session cookies set by exchangeCodeForSession are preserved
    const isProduction = process.env.NODE_ENV === "production";
    const isHttps = requestUrl.protocol === "https:";
    
    // Ensure cookies are set with proper flags
    // SameSite=None requires Secure=true (HTTPS)
    const cookiesToSet = tempResponse.cookies.getAll();
    console.log(`Auth callback: Setting ${cookiesToSet.length} cookies, isProduction: ${isProduction}, isHttps: ${isHttps}`);
    
    cookiesToSet.forEach((cookie) => {
      // Determine SameSite value: use 'none' only if HTTPS, otherwise use 'lax'
      const sameSiteValue = isHttps && isProduction 
        ? ("none" as const)
        : (cookie.sameSite as "lax" | "strict" | "none" | undefined) ?? ("lax" as const);
      
      // Secure flag: must be true if SameSite is 'none', otherwise use production setting
      const secureValue = sameSiteValue === "none" ? true : (cookie.secure ?? isProduction);
      
      finalResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path || "/",
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly ?? true,
        secure: secureValue,
        sameSite: sameSiteValue,
      });
      
      console.log(`Auth callback: Set cookie ${cookie.name} with sameSite=${sameSiteValue}, secure=${secureValue}`);
    });
    
    // Log successful authentication for debugging
    console.log("Auth callback: Authentication successful, redirecting with cookies set and session tokens in URL hash");
    console.log("Auth callback: User ID:", data.user.id);
    console.log("Auth callback: Session expires at:", data.session.expires_at);

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

