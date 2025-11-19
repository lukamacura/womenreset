// app/layout.tsx
import "./globals.css";

import Link from "next/link";
import { Inter, Playfair_Display } from "next/font/google";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// ✅ Ensure this layout isn't cached with a stale user
export const dynamic = "force-dynamic";
export const revalidate = 0;

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WomenReset",
  description: "AI companion for women’s health and menopause support",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // cookies() is currently synchronous in Next, so no await here
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // No-ops in Server Components
        set() {},
        remove() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen flex flex-col font-sans bg-background text-foreground">
        <header className="border-b border-white/10">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              WomenReset
            </Link>

            <div className="flex items-center gap-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-black hover:opacity-90"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-bold text-black hover:text-primary"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-black hover:opacity-90"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        {/* Full-height content area for pages like the chat */}
        <main className="flex-1 w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
