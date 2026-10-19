import type { Metadata, Viewport } from "next";
import { Noto_Serif, Roboto } from "next/font/google";
import type { ReactNode } from "react";
import { GoogleAnalytics } from "@/components/google-analytics";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
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

// Defaults for every page (proposal 4.3): title template, description, social previews (the image
// is app/opengraph-image.tsx) and the Search Console verification tag when
// NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION is set. Pages override title, description and canonical.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "SAT Sharks", template: "%s | SAT Sharks" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image" },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
  formatDetection: { telephone: false },
};

// The site is designed for light mode only. "only light" stops browsers that darken pages on their
// own (Chrome and Samsung Internet on phones in dark mode) from recolouring it, which turned the
// brand blue into a pale purple.
export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "only light", themeColor: "#324dc7" };

// Pages live in two groups: (site) adds the navigation bar, (test) is the full-screen test view.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${roboto.variable} ${notoSerif.variable}`}>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
