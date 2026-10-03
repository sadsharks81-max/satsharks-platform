import Link from "next/link";
import type { ReactNode } from "react";

// Where students write about their account and data. Not decided yet; until it is set, the pages
// say so rather than show an address that nobody reads.
export const LEGAL_CONTACT_EMAIL: string | null = null;

export const LEGAL_LAST_UPDATED = "3 October 2026";

export function LegalPage({ title, intro, sections }: { title: string; intro: ReactNode; sections: { heading: string; body: ReactNode }[] }) {
  return (
    <article className="mx-auto max-w-3xl py-6 sm:py-10">
      <header className="border-b border-slate-300 pb-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {LEGAL_LAST_UPDATED}</p>
        <div className="mt-4 text-[15px] leading-relaxed text-slate-700">{intro}</div>
      </header>
      <nav aria-label="On this page" className="my-6 rounded-xl border border-slate-300 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">On this page</p>
        <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {sections.map((section, index) => (
            <li key={section.heading}>
              <a href={`#section-${index + 1}`} className="font-medium text-brand-600 hover:underline">
                {index + 1}. {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="space-y-8">
        {sections.map((section, index) => (
          <section key={section.heading} id={`section-${index + 1}`} className="scroll-mt-6">
            <h2 className="text-xl font-bold tracking-tight">
              {index + 1}. {section.heading}
            </h2>
            <div className="legal-body mt-3 space-y-3 text-[15px] leading-relaxed text-slate-700">{section.body}</div>
          </section>
        ))}
      </div>
      <p className="mt-10 border-t border-slate-300 pt-6 text-sm text-slate-600">
        See also:{" "}
        <Link href="/terms" className="font-bold text-brand-500 hover:underline">
          Terms of Service
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="font-bold text-brand-500 hover:underline">
          Privacy Policy
        </Link>{" "}
        ·{" "}
        <Link href="/pricing" className="font-bold text-brand-500 hover:underline">
          Pricing
        </Link>
      </p>
    </article>
  );
}

export function ContactLine() {
  return LEGAL_CONTACT_EMAIL ? (
    <p>
      Questions? Write to{" "}
      <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-bold text-brand-500 hover:underline">
        {LEGAL_CONTACT_EMAIL}
      </a>
      .
    </p>
  ) : (
    <p>A contact address for questions about these pages will be published here.</p>
  );
}
