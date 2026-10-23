import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

// Sent with every page. No script-src rule: Next.js, KaTeX and the calculator need inline code, and a
// wrong rule would break pages; these only stop framing (clickjacking), plugins and <base> tricks.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Reset links carry a token in the URL: other sites only ever see this site's origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // A second dev server (e.g. a test run on another port) must use its own build folder: two
  // servers writing to the same .next corrupt each other's chunks (ChunkLoadError).
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  transpilePackages: ["@satsharks/types"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The browser only ever talks to this origin. /api/* is forwarded to the Express API, which keeps
  // the auth cookie first-party and avoids cross-site cookie rules between Vercel and Railway.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
