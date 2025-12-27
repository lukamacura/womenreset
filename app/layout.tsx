// app/layout.tsx
import "./globals.css";

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import ConditionalNavbar from "@/components/ConditionalNavbar";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// app/layout.tsx
import localFont from "next/font/local";
import { Dancing_Script } from "next/font/google";

const satoshi = localFont({
  src: [
    { path: "../public/fonts/Satoshi-Light.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Satoshi-Regular.woff2",  weight: "500", style: "normal" },
    { path: "../public/fonts/Satoshi-Bold.woff2",    weight: "700", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-script",
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
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${satoshi.variable}  ${dancingScript.variable}`}>
      <body className="min-h-screen flex flex-col font-sans text-foreground bg-white">
        <ConditionalNavbar isAuthenticated={!!user} />

        <main className="flex-1 w-full">{children}</main>
      </body>
    </html>
  );
}
