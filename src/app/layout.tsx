import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Taka AI — Autonomous Neural Super-Intelligence by Takadori",
  description: "Taka AI Neural Gateway: Autonomous live web search, multi-model intelligence, and high-speed streaming API. Architected by Takadori.",
  robots: "noarchive",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Security Meta Tags */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body className="antialiased min-h-screen bg-[#090d16] text-slate-100">
        {children}
        {/* Taka AI Neural Shield — Anti-Tamper & Intrusion Detection */}
        <Script src="/taka-shield.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
