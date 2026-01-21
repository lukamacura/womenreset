// app/layout.tsx
import "./globals.css";

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import ConditionalNavbar from "@/components/ConditionalNavbar";

// Removed force-dynamic to enable static optimization for landing page
// export const dynamic = "force-dynamic";
// export const revalidate = 0;
// app/layout.tsx
import localFont from "next/font/local";
import { Dancing_Script, Poppins, Lora } from "next/font/google";

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

// Tweakcn theme fonts
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MenoLisa | AI support for women in menopause",
  description: "AI companion for women's health and menopause support",
  icons: {
    icon: "/lisa_profile.webp",
    shortcut: "/lisa_profile.webp",
    apple: "/lisa_profile.webp",
  },
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

  // Check for valid user - verify session is actually valid
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Only pass true if we have a valid user (no error and user exists)
  const isAuthenticated = !authError && !!user;

  return (
    <html lang="en" className={`${satoshi.variable} ${dancingScript.variable} ${poppins.variable} ${lora.variable}`}>
      <body className="min-h-screen flex flex-col font-sans text-foreground bg-background">
        <ConditionalNavbar isAuthenticated={isAuthenticated} />

        <main className="flex-1 w-full">{children}</main>
      </body>
    </html>
  );
}
