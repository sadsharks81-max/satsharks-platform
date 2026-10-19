// Structured data (schema.org, JSON-LD) so Google can show rich results and AI search engines can
// describe SAT Sharks accurately. Rendered on the server into the page's HTML.
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  // "<" is escaped so text inside can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export const organizationLd = () => ({
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl("/icon.svg"),
  description: SITE_DESCRIPTION,
  areaServed: ["PK", "Worldwide"],
  sameAs: ["https://wa.me/923066595745"],
  contactPoint: { "@type": "ContactPoint", contactType: "customer support", telephone: "+92-306-6595745", availableLanguage: ["English", "Urdu"] },
});

export const websiteLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "en",
});

export const courseLd = () => ({
  "@context": "https://schema.org",
  "@type": "Course",
  name: "Digital SAT preparation with real past papers",
  description:
    "Full-length adaptive Digital SAT practice tests in the Bluebook format (Reading and Writing, then Math, two modules each), drills by topic and skill, scores from 400 to 1600, a predicted score and analytics of the skills costing points.",
  provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  educationalLevel: "High school",
  inLanguage: "en",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", category: "Free", price: 0, priceCurrency: "USD", url: absoluteUrl("/pricing") },
  hasCourseInstance: { "@type": "CourseInstance", courseMode: "Online", courseWorkload: "Self-paced" },
});

export const faqLd = (items: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
});

export const breadcrumbLd = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.path) })),
});
