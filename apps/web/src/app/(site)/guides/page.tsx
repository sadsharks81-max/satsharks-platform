import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, breadcrumbLd } from "@/components/json-ld";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Digital SAT guides",
  description: "Clear answers about the Digital SAT: the format and timing, how scoring works, free practice, and taking the SAT in Pakistan.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-4xl py-6 sm:py-10">
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "SAT guides", path: "/guides" }])} />
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-[40px] sm:leading-tight">Digital SAT guides</h1>
        <p className="mt-3 text-slate-600">Short, clear answers to what students ask most about the Digital SAT.</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {GUIDES.map((guide) => (
          <li key={guide.slug}>
            <Link href={`/guides/${guide.slug}`} className="block h-full rounded-2xl border border-slate-900 bg-white p-5 transition hover:bg-slate-50">
              <h2 className="text-lg font-bold tracking-tight">{guide.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{guide.description}</p>
              <span className="mt-3 inline-block text-sm font-bold text-brand-500">Read the guide →</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center text-sm text-slate-600">
        More questions? See the{" "}
        <Link href="/faq" className="font-bold text-brand-500 hover:underline">
          FAQ
        </Link>{" "}
        or the{" "}
        <Link href="/sat-dates" className="font-bold text-brand-500 hover:underline">
          upcoming SAT dates
        </Link>
        .
      </p>
    </div>
  );
}
