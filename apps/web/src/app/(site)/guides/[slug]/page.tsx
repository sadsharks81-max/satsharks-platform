import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd, breadcrumbLd } from "@/components/json-ld";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: { type: "article", title: guide.title, description: guide.description, url: `/guides/${guide.slug}` },
  };
}

function Paragraph({ text }: { text: string }) {
  if (text.startsWith("- ")) {
    return (
      <ul className="list-disc space-y-1 pl-6">
        {text.split("\n").map((line) => (
          <li key={line}>{line.replace(/^- /, "")}</li>
        ))}
      </ul>
    );
  }
  return <p>{text}</p>;
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideBySlug((await params).slug);
  if (!guide) notFound();
  const path = `/guides/${guide.slug}`;
  const others = GUIDES.filter((entry) => entry.slug !== guide.slug);

  return (
    <article className="mx-auto max-w-3xl py-6 sm:py-10">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: guide.title,
            description: guide.description,
            dateModified: guide.updated,
            datePublished: guide.updated,
            mainEntityOfPage: absoluteUrl(path),
            author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") } },
          },
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "SAT guides", path: "/guides" },
            { name: guide.title, path },
          ]),
        ]}
      />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/guides" className="font-bold text-brand-500 hover:underline">
          ← SAT guides
        </Link>
      </nav>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{guide.title}</h1>
      <p className="mt-2 text-sm text-slate-500">Updated {new Date(`${guide.updated}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</p>
      <p className="mt-6 rounded-2xl border border-brand-500 bg-brand-50 p-5 text-[16px] leading-relaxed text-slate-800">{guide.summary}</p>
      <div className="mt-8 space-y-8">
        {guide.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-bold tracking-tight">{section.heading}</h2>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-700">
              {section.paragraphs.map((text) => (
                <Paragraph key={text} text={text} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-900 bg-white p-5">
        <p className="font-bold">Practise on real past Digital SAT papers, free.</p>
        <Link href={guide.cta.href} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
          {guide.cta.label}
        </Link>
      </div>
      <aside className="mt-10 border-t border-slate-300 pt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">More guides</h2>
        <ul className="mt-3 space-y-2">
          {others.map((entry) => (
            <li key={entry.slug}>
              <Link href={`/guides/${entry.slug}`} className="font-bold text-brand-500 hover:underline">
                {entry.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <p className="mt-8 text-xs text-slate-500">SAT is a trademark of the College Board, which is not linked to SAT Sharks and does not endorse it.</p>
    </article>
  );
}
