import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taka AI Gateway - High Performance API Rotator",
  description: "Enterprise-grade OpenAI-compatible Groq API load balancer and rate-limit rotator engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#090d16] text-slate-100">
        {children}
      </body>
    </html>
  );
}
