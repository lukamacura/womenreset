import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const response = NextResponse.redirect(`${requestUrl.origin}${next}`);

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
      // Check if user has completed profile
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("user_id", data.session.user.id)
        .maybeSingle();

      // If profile doesn't exist and next is /register, redirect to /register
      // Otherwise, if profile doesn't exist, redirect to /register to complete quiz
      if (!profile && profileError?.code !== "42P01") {
        // Table exists but no profile found
        const redirectUrl = next === "/register" 
          ? `${requestUrl.origin}/register`
          : `${requestUrl.origin}/register`;
        return NextResponse.redirect(redirectUrl);
      }

      // If profile exists or table doesn't exist (fallback), use the original next URL
      // But if next is /register and profile exists, redirect to dashboard
      if (profile && next === "/register") {
        return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
      }

      return response;
    }
  }

  // return the user to login page with error message
  return NextResponse.redirect(
    `${requestUrl.origin}/login?error=auth_callback_error&message=${encodeURIComponent("Email confirmation failed. Please try again or contact support.")}`
  );
}

