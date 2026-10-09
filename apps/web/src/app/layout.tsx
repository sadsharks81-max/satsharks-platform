import type { Metadata, Viewport } from "next";
import { Noto_Serif, Roboto } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "katex/dist/katex.min.css";
import "./globals.css";

// Roboto for the interface and Noto Serif for question text, as in the Bluebook-style reference.
// next/font downloads them at build time and serves them from this site.
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-roboto",
  display: "swap",
});
const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-noto-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "SAT Sharks", template: "%s | SAT Sharks" },
  description: "Digital SAT practice with real past papers.",
};

// The site is designed for light mode only. "only light" stops browsers that darken pages on their
// own (Chrome and Samsung Internet on phones in dark mode) from recolouring it, which turned the
// brand blue into a pale purple.
export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "only light" };

// Pages live in two groups: (site) adds the navigation bar, (test) is the full-screen test view.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${roboto.variable} ${notoSerif.variable}`}>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
