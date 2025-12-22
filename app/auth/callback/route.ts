import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SITE_URL } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Always use womenreset.com for redirects after email authentication
  const baseUrl = SITE_URL;

  if (!code) {
    console.error("Auth callback: No code parameter found");
    return NextResponse.redirect(
      `${baseUrl}/login?error=auth_callback_error&message=${encodeURIComponent("No authentication code provided. Please try again.")}`
    );
  }

  // Create a response object for cookie handling
  const response = NextResponse.redirect(`${baseUrl}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set cookies on both request and response
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // Remove cookies from both request and response
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  try {
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

    // Create final redirect response with updated URL
    const finalResponse = NextResponse.redirect(redirectUrl);
    
    // Copy all cookies from the response to the final response
    response.cookies.getAll().forEach((cookie) => {
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

    return finalResponse;
  } catch (error) {
    console.error("Auth callback exception:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
    return NextResponse.redirect(
      `${baseUrl}/login?error=auth_callback_error&message=${encodeURIComponent(errorMessage)}`
    );
  }
}

