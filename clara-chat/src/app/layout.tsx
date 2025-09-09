import "./globals.css";
import localFont from "next/font/local";

const chubbo = localFont({
  src: [
    { path: "../../public/fonts/Chubbo-Bold.woff2", weight: "900", style: "normal" },
    { path: "../../public/fonts/Supreme-Regular.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-chubbo",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={chubbo.variable}>
      <body className="bg-[#120E0F] text-[#EDE7E8] antialiased">{children}</body>
    </html>
  );
}
