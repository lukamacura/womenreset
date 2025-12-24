import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SITE_URL } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  
  // Try to get redirect target from cookie first (set before sending magic link)
  // Fallback to query parameter (for backwards compatibility) or default
  const cookieRedirectTarget = request.cookies.get("auth_redirect_target")?.value;
  const queryRedirectTarget = requestUrl.searchParams.get("next");
  const next = cookieRedirectTarget 
    ? decodeURIComponent(cookieRedirectTarget)
    : (queryRedirectTarget ?? "/dashboard");
  
  console.log("Auth callback: redirect target from cookie:", cookieRedirectTarget);
  console.log("Auth callback: redirect target from query:", queryRedirectTarget);
  console.log("Auth callback: final redirect target:", next);

  // Use request origin in development, SITE_URL in production
  // This ensures magic links work in both dev and prod
  const baseUrl = process.env.NODE_ENV === "production" 
    ? SITE_URL 
    : `${requestUrl.protocol}//${requestUrl.host}`;
  
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
      // If they do, redirect to dashboard; otherwise, redirect to register to complete quiz
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (profile) {
        // User already has a profile - redirect to dashboard
        redirectUrl = `${baseUrl}/dashboard`;
      } else {
        // User needs to complete registration - redirect to register page
        redirectUrl = `${baseUrl}/register`;
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
    
    // Clear the auth_redirect_target cookie after use
    finalResponse.cookies.set("auth_redirect_target", "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
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

