// The public address of the site, for canonical links, the sitemap, social previews and structured
// data. Set NEXT_PUBLIC_SITE_URL to the SAT Sharks domain at launch (e.g. https://satsharks.com);
// until then Vercel's production URL is used (set by Vercel at build time), or localhost.
const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

export const SITE_URL = fromEnv || (vercel ? `https://${vercel}` : "http://localhost:3000");
export const SITE_NAME = "SAT Sharks";
export const SITE_DESCRIPTION =
  "Digital SAT practice with real past papers: Bluebook-style adaptive tests, scores out of 1600, a predicted score, the topics costing you points, and daily goals. Free to start, in Pakistan and worldwide.";

export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

// Pages that are for signed-in accounts only: never indexed, and kept out of the sitemap.
export const PRIVATE_PATHS = [
  "/admin",
  "/dashboard",
  "/portal",
  "/practice",
  "/full-tests",
  "/history",
  "/mistakes",
  "/analytics",
  "/goals",
  "/leaderboard",
  "/billing",
  "/checkout",
  "/receipts",
  "/reset-password",
  "/api",
];
