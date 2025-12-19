import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Always use www.womenreset.com for redirects after email authentication
  const baseUrl = "https://www.womenreset.com";

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

    // Determine redirect URL based on the flow (login vs registration)
    let redirectUrl: string;
    if (next === "/register") {
      // User is coming from REGISTRATION flow - always redirect to register page to complete quiz
      redirectUrl = `${baseUrl}/register`;
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
    return NextResponse.redirect(
      `${baseUrl}/login?error=auth_callback_error&message=${encodeURIComponent("An unexpected error occurred. Please try again.")}`
    );
  }
}

