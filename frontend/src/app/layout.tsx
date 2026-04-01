import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MovieRec — AI Movie Recommendations",
  description: "Discover movies with AI-powered search",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
