import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // A second dev server (e.g. a test run on another port) must use its own build folder: two
  // servers writing to the same .next corrupt each other's chunks (ChunkLoadError).
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  transpilePackages: ["@satsharks/types"],
  // The browser only ever talks to this origin. /api/* is forwarded to the Express API, which keeps
  // the auth cookie first-party and avoids cross-site cookie rules between Vercel and Railway.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
