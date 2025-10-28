import "./globals.css";


import Link from "next/link";
import "./globals.css";
import { Inter, Playfair_Display } from "next/font/google";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",         // <— NOVO IME
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-playfair",      // <— NOVO IME
  display: "swap",
});

export const metadata = {
  title: "WomenReset",
  description: "AI companion for women’s health and menopause support",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen font-sans">
        <header className="border-b border-white/10">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight">WomenReset</Link>
            <div className="flex items-center gap-4">
              <Link href="/login" className="font-bold text-sm text-black hover:text-primary">Log in</Link>
              <Link href="/register" className="font-bold text-sm text-black hover:text-primary">Sign up</Link>
              <Link href="/dashboard" className="font-bold text-sm bg-primary text-black px-3 py-1.5 rounded-md hover:opacity-90">
                Dashboard
              </Link>
            </div>
          </nav>
        </header>

        <main className="max-w-screen mx-auto font-sans px-4 py-10">{children}</main>

        <footer className="max-w-6xl mx-auto px-4 py-10 text-sm text-gray-400">
          © {new Date().getFullYear()} WomenReset
        </footer>
      </body>
    </html>
  );
}
