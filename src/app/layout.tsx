import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liquid Glass Script Generator - Premium Viral Content Creator",
  description: "AI-powered short-form script creator for YouTube Shorts and Instagram Reels. Featuring interactive iOS 26 liquid glass aesthetics, prompt tuning, and advanced SEO tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* Persistent Liquid Animated Blobs */}
        <div className="liquid-bg">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>
        {children}
      </body>
    </html>
  );
}
