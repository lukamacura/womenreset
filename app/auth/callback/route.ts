import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    // We need to create a response that we can modify
    // First, determine a temporary redirect URL (will be updated)
    let redirectUrl = `${requestUrl.origin}${next}`;
    const response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
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

    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Determine redirect URL based on the flow (login vs registration)
      if (next === "/register") {
        // User is coming from REGISTRATION flow - always redirect to register page to complete quiz
        redirectUrl = `${requestUrl.origin}/register`;
      } else {
        // User is coming from LOGIN flow - always redirect to dashboard (or the specified next target)
        const sanitizedNext = next.startsWith("/") ? next : "/dashboard";
        redirectUrl = `${requestUrl.origin}${sanitizedNext}`;
      }

      // Create final redirect response with cookies from the exchange
      const finalResponse = NextResponse.redirect(redirectUrl);
      
      // Copy cookies from the exchange response
      response.cookies.getAll().forEach((cookie) => {
        finalResponse.cookies.set(cookie.name, cookie.value, {
          path: cookie.path,
          domain: cookie.domain,
          maxAge: cookie.maxAge,
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite as "lax" | "strict" | "none" | undefined,
        });
      });

      return finalResponse;
    }
  }

  // return the user to login page with error message
  return NextResponse.redirect(
    `${requestUrl.origin}/login?error=auth_callback_error&message=${encodeURIComponent("Authentication failed. Please try again or contact support.")}`
  );
}

