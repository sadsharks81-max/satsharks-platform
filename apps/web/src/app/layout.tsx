import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SAT Sharks", template: "%s | SAT Sharks" },
  description: "Digital SAT practice with real past papers.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Pages live in two groups: (site) adds the navigation bar, (test) is the full-screen test view.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
