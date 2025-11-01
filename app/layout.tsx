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
  // Next 16 may expose cookies() as async — await before .get()
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

  const year = new Date().getFullYear();

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen font-sans">
        <header className="border-b border-white/10">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight">
              WomenReset
            </Link>

            <div className="flex items-center gap-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="font-bold text-sm bg-primary text-black px-3 py-1.5 rounded-md hover:opacity-90"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="font-bold text-sm text-black hover:text-primary"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="font-bold text-sm bg-primary text-black px-3 py-1.5 rounded-md hover:opacity-90"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        <main className="max-w-screen mx-auto font-sans px-4 py-5">
          {children}
        </main>

        <footer className="max-w-6xl mx-auto px-4 py-10 text-sm text-gray-400">
          © {year} WomenReset
        </footer>
      </body>
    </html>
  );
}
