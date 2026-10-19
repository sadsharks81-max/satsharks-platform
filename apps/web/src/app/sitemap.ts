import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";
import { absoluteUrl } from "@/lib/site";

// Public pages only (account pages and the admin portal are never listed; see robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly") => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    {
      ...page("/pricing", 0.9),
      alternates: { languages: { "en-PK": absoluteUrl("/pricing/pakistan"), en: absoluteUrl("/pricing/international"), "x-default": absoluteUrl("/pricing") } },
    },
    page("/pricing/pakistan", 0.8),
    page("/pricing/international", 0.8),
    page("/sat-dates", 0.8),
    page("/faq", 0.7, "monthly"),
    page("/guides", 0.8, "monthly"),
    ...GUIDES.map((guide) => ({ ...page(`/guides/${guide.slug}`, 0.7, "monthly"), lastModified: new Date(`${guide.updated}T00:00:00Z`) })),
    page("/register", 0.6, "yearly"),
    page("/login", 0.3, "yearly"),
    page("/terms", 0.2, "yearly"),
    page("/privacy", 0.2, "yearly"),
    page("/refund", 0.2, "yearly"),
  ];
}
