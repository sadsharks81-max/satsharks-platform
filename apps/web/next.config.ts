import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  transpilePackages: ["@satsharks/types"],
  // The browser only ever talks to this origin. /api/* is forwarded to the Express API, which keeps
  // the auth cookie first-party and avoids cross-site cookie rules between Vercel and Railway.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
