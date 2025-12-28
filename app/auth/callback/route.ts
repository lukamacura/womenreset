import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorCode = requestUrl.searchParams.get("error_code");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Use request origin to ensure we redirect to the same host the user is accessing
  // This works for both localhost and production
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
  
  console.log("Auth callback: baseUrl =", baseUrl);

  // Handle Supabase error parameters (e.g., otp_expired, access_denied)
  if (error || errorCode) {
    console.error("Auth callback: Supabase error detected", { error, errorCode, errorDescription });
    
    let errorMessage = "Authentication failed. Please try again.";
    
    if (errorCode === "otp_expired") {
      errorMessage = "The email link has expired. Please request a new magic link.";
    } else if (errorCode === "access_denied") {
      errorMessage = errorDescription 
        ? decodeURIComponent(errorDescription)
        : "Access denied. Please try again.";
    } else if (errorDescription) {
      errorMessage = decodeURIComponent(errorDescription);
    }
    
    return NextResponse.redirect(
      `${baseUrl}/login?error=auth_callback_error&message=${encodeURIComponent(errorMessage)}`
    );
  }

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
          const isHttps = requestUrl.protocol === "https:";
          
          // For production HTTPS, use SameSite=None with Secure=true
          // For development or HTTP, use SameSite=Lax
          const sameSiteValue = isHttps
            ? (options.sameSite as "none" | "lax" | "strict" | undefined) ?? "none"
            : (options.sameSite as "lax" | "strict" | "none" | undefined) ?? "lax";
          
          const secureValue = sameSiteValue === "none" ? true : (options.secure ?? isHttps);
          
          tempResponse.cookies.set({
            name,
            value,
            ...options,
            sameSite: sameSiteValue,
            secure: secureValue,
            httpOnly: options.httpOnly ?? true,
            path: options.path || "/",
            // Don't set domain - let browser use default (current domain)
            // domain: options.domain, // Explicitly don't set domain
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
    
    // Check for quiz answers in URL parameters (for registration flow)
    const quizParam = requestUrl.searchParams.get("quiz");
    
    // Get admin client early (needed for both checking and inserting/updating)
    const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
    const adminSupabase = getSupabaseAdmin();
    
    // Check if user already has a profile (using admin client to bypass RLS)
    const { data: existingProfile, error: profileCheckError } = await adminSupabase
      .from("user_profiles")
      .select("user_id, name, top_problems, severity, timing, tried_options, doctor_status, goal")
      .eq("user_id", data.user.id)
      .maybeSingle();
    
    if (profileCheckError) {
      console.error("Auth callback: Error checking for existing profile:", profileCheckError);
    }
    
    console.log("Auth callback: Existing profile check:", {
      hasProfile: !!existingProfile,
      hasQuizParam: !!quizParam,
      next: next,
      isRegisterFlow: next === "/register",
      allParams: Object.fromEntries(requestUrl.searchParams.entries())
    });
    
    // IMPORTANT: Process quiz data FIRST if it exists, regardless of next parameter
    // Supabase might not preserve the next parameter, but quiz param should be there
    if (quizParam) {
      console.log("Auth callback: Quiz parameter found, processing quiz data");
      
      try {
        const decodedAnswers = JSON.parse(atob(decodeURIComponent(quizParam)));
        
        console.log("Auth callback: Decoded quiz answers:", {
          hasName: decodedAnswers.name !== undefined,
          hasTopProblems: decodedAnswers.top_problems !== undefined,
          hasSeverity: decodedAnswers.severity !== undefined,
          hasTiming: decodedAnswers.timing !== undefined,
          hasTriedOptions: decodedAnswers.tried_options !== undefined,
          hasDoctorStatus: decodedAnswers.doctor_status !== undefined,
          hasGoal: decodedAnswers.goal !== undefined,
        });
        
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
        
        // Store all quiz answers
        if (decodedAnswers.name !== undefined && decodedAnswers.name !== null) {
          profileData.name = String(decodedAnswers.name).trim() || null;
        }
        if (decodedAnswers.top_problems !== undefined && Array.isArray(decodedAnswers.top_problems) && decodedAnswers.top_problems.length > 0) {
          profileData.top_problems = decodedAnswers.top_problems;
        }
        if (decodedAnswers.severity !== undefined && decodedAnswers.severity !== null) {
          profileData.severity = String(decodedAnswers.severity);
        }
        if (decodedAnswers.timing !== undefined && decodedAnswers.timing !== null) {
          profileData.timing = String(decodedAnswers.timing);
        }
        if (decodedAnswers.tried_options !== undefined && Array.isArray(decodedAnswers.tried_options) && decodedAnswers.tried_options.length > 0) {
          profileData.tried_options = decodedAnswers.tried_options;
        }
        if (decodedAnswers.doctor_status !== undefined && decodedAnswers.doctor_status !== null) {
          profileData.doctor_status = String(decodedAnswers.doctor_status);
        }
        if (decodedAnswers.goal !== undefined) {
          if (Array.isArray(decodedAnswers.goal) && decodedAnswers.goal.length > 0) {
            profileData.goal = String(decodedAnswers.goal[0]);
          } else if (decodedAnswers.goal !== null) {
            profileData.goal = String(decodedAnswers.goal);
          }
        }
        
        // Clean profile data - remove undefined values
        const cleanProfileData: {
          user_id: string;
          name?: string | null;
          top_problems?: string[];
          severity?: string | null;
          timing?: string | null;
          tried_options?: string[];
          doctor_status?: string | null;
          goal?: string | null;
        } = {
          user_id: profileData.user_id,
        };
        
        if (profileData.name !== undefined) cleanProfileData.name = profileData.name;
        if (profileData.top_problems !== undefined && profileData.top_problems.length > 0) {
          cleanProfileData.top_problems = profileData.top_problems;
        }
        if (profileData.severity !== undefined) cleanProfileData.severity = profileData.severity;
        if (profileData.timing !== undefined) cleanProfileData.timing = profileData.timing;
        if (profileData.tried_options !== undefined && profileData.tried_options.length > 0) {
          cleanProfileData.tried_options = profileData.tried_options;
        }
        if (profileData.doctor_status !== undefined) cleanProfileData.doctor_status = profileData.doctor_status;
        if (profileData.goal !== undefined) cleanProfileData.goal = profileData.goal;
        
        console.log("Auth callback: Clean profile data to save:", JSON.stringify(cleanProfileData, null, 2));
        
        if (existingProfile) {
          // Profile exists - update it with quiz data
          console.log("Auth callback: Profile exists, updating with quiz data");
          const { error: updateError } = await adminSupabase
            .from("user_profiles")
            .update(cleanProfileData)
            .eq("user_id", data.user.id);
          
          if (updateError) {
            console.error("Error updating profile with quiz answers:", updateError);
            console.error("Update error details:", {
              code: updateError.code,
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
            });
          } else {
            console.log("Profile updated successfully with quiz answers");
          }
        } else {
          // No profile exists - create it with quiz data
          console.log("Auth callback: No profile exists, creating new profile with quiz data");
          const { error: insertError, data: insertedProfile } = await adminSupabase
            .from("user_profiles")
            .insert([cleanProfileData])
            .select();
          
          if (insertError) {
            console.error("Error creating profile with quiz answers:", insertError);
            console.error("Insert error details:", {
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint,
            });
            console.error("Profile data that failed to insert:", JSON.stringify(cleanProfileData, null, 2));
            
            // Try fallback to intake API
            try {
              console.log("Attempting fallback: calling /api/intake to save quiz answers");
              const { user_id: _userId, ...profileDataWithoutUserId } = cleanProfileData;
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
                const intakeResult = await intakeResponse.json();
                console.log("Successfully saved quiz answers via /api/intake fallback:", intakeResult);
              } else {
                const intakeError = await intakeResponse.json();
                console.error("Intake API also failed:", intakeError);
              }
            } catch (fallbackError) {
              console.error("Fallback to intake API also failed:", fallbackError);
            }
          } else {
            if (insertedProfile && insertedProfile.length > 0) {
              console.log("Profile created successfully with quiz data:", {
                user_id: insertedProfile[0].user_id,
                name: insertedProfile[0].name,
                top_problems: insertedProfile[0].top_problems,
                severity: insertedProfile[0].severity,
                timing: insertedProfile[0].timing,
                tried_options: insertedProfile[0].tried_options,
                doctor_status: insertedProfile[0].doctor_status,
                goal: insertedProfile[0].goal,
              });
            } else {
              console.warn("Profile insert returned no data, but no error occurred");
            }
          }
        }
      } catch (parseError) {
        console.error("Error parsing quiz answers:", parseError);
      }
    }
    
    // Determine redirect URL (after processing quiz data)
    if (existingProfile) {
      // User already has a profile - always redirect to dashboard
      console.log("Auth callback: Profile exists, redirecting to dashboard");
      redirectUrl = `${baseUrl}/dashboard`;
    } else {
      // User is coming from LOGIN flow or registration without quiz - redirect to dashboard
      const sanitizedNext = next.startsWith("/") ? next : "/dashboard";
      redirectUrl = `${baseUrl}${sanitizedNext}`;
    }

    // Ensure redirectUrl is absolute (should already be, but double-check)
    if (!redirectUrl.startsWith("http")) {
      redirectUrl = `${baseUrl}${redirectUrl.startsWith("/") ? redirectUrl : `/${redirectUrl}`}`;
    }
    
    // Copy all cookies from the temp response to the final response
    // This ensures the session cookies set by exchangeCodeForSession are preserved
    const isHttps = requestUrl.protocol === "https:";
    const cookiesToSet = tempResponse.cookies.getAll();
    
    console.log("Auth callback: Redirecting to:", redirectUrl);
    console.log("Auth callback: Session exists:", !!data.session);
    console.log("Auth callback: User ID:", data.user.id);
    console.log("Auth callback: Cookies to set:", cookiesToSet.length);

    // Create the final redirect response
    const finalResponse = NextResponse.redirect(redirectUrl);
    
    cookiesToSet.forEach((cookie) => {
      // Determine SameSite value: use 'none' for HTTPS, 'lax' for HTTP
      const sameSiteValue = isHttps
        ? (cookie.sameSite as "lax" | "strict" | "none" | undefined) ?? ("none" as const)
        : (cookie.sameSite as "lax" | "strict" | "none" | undefined) ?? ("lax" as const);
      
      // Secure flag: must be true if SameSite is 'none', otherwise match HTTPS
      const secureValue = sameSiteValue === "none" ? true : (cookie.secure ?? isHttps);
      
      finalResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path || "/",
        // Don't explicitly set domain - let browser use default (current domain)
        // This ensures cookies work for the exact domain (womenreset.com)
        maxAge: cookie.maxAge,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly ?? true,
        secure: secureValue,
        sameSite: sameSiteValue,
      });
    });
    
    // Return response with cookies
    return finalResponse;
  } catch (error) {
    console.error("Auth callback exception:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
    return NextResponse.redirect(
      `${baseUrl}/login?error=auth_callback_error&message=${encodeURIComponent(errorMessage)}`
    );
  }
}

