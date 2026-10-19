import type { MetadataRoute } from "next";
import { PRIVATE_PATHS, SITE_URL } from "@/lib/site";

// Public pages are open to search engines and to AI search crawlers (proposal 4.3 "GEO"), so
// ChatGPT, Google AI Overviews, Perplexity and Claude can read and cite them. Account pages, the
// admin portal and the API are closed to all of them.
const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot"];

export default function robots(): MetadataRoute.Robots {
  const disallow = PRIVATE_PATHS.map((path) => (path === "/api" ? "/api/" : path));
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt"], disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
