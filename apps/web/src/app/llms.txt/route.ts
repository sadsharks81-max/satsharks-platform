import { GUIDES } from "@/lib/guides";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site";

// /llms.txt (llmstxt.org): a plain summary of the site for AI assistants and AI search, with links
// to the pages worth reading (proposal 4.3 "GEO").
export const dynamic = "force-static";

export function GET(): Response {
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "SAT Sharks is an independent Digital SAT practice website for students in Pakistan and worldwide. Students sit full past Digital SAT papers in a Bluebook-style adaptive test screen (Reading and Writing, a 10-minute break, then Math, two modules each, with Desmos, a reference sheet and a timer), get section scores from 200 to 800 and a total from 400 to 1600, and practise drills by topic, skill and difficulty with instant answer checks.",
    "After each test it shows a predicted SAT score, the skills costing the most points, error patterns and timing, and keeps every question attempted in a history and a mistake bank with spaced retries. Daily goals, streaks and leaderboards keep practice regular.",
    "Plans: a free plan, and paid Monthly and 3 Months plans, priced in PKR for Pakistan and in USD for everyone else. SAT is a trademark of the College Board, which is not linked to SAT Sharks and does not endorse it.",
    "",
    "## Main pages",
    `- [Home](${absoluteUrl("/")}): what SAT Sharks offers`,
    `- [Pricing](${absoluteUrl("/pricing")}): plans and what free and paid include`,
    `- [Prices in Pakistan (PKR)](${absoluteUrl("/pricing/pakistan")})`,
    `- [Prices for international students (USD)](${absoluteUrl("/pricing/international")})`,
    `- [SAT dates](${absoluteUrl("/sat-dates")}): upcoming test dates and registration deadlines`,
    `- [FAQ](${absoluteUrl("/faq")}): common questions about SAT Sharks`,
    "",
    "## Guides",
    ...GUIDES.map((guide) => `- [${guide.title}](${absoluteUrl(`/guides/${guide.slug}`)}): ${guide.description}`),
    "",
    "## Optional",
    `- [Terms of Service](${absoluteUrl("/terms")})`,
    `- [Privacy Policy](${absoluteUrl("/privacy")})`,
    `- [Refund Policy](${absoluteUrl("/refund")})`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
