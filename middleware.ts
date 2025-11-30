import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const { pathname } = req.nextUrl;

  // ✅ define protected areas
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/chat/lisa") ||
    pathname.startsWith("/api/vectorshift") ||
    pathname.startsWith("/api/langchain-rag");

  // allow everything else
  if (!isProtected) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

// ✅ run middleware only where needed
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chat/lisa/:path*",
    "/api/vectorshift",
    "/api/langchain-rag",
  ],
};
