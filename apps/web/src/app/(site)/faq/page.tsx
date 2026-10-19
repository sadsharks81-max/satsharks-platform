import type { Metadata } from "next";
import { FAQS, FaqList } from "@/components/faq";
import { JsonLd, faqLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about SAT Sharks: real past papers, the free plan, the Bluebook-style test screen and more.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl py-6 sm:py-10">
      {/* Only the answers that are plain text; structured data must match what the page shows. */}
      <JsonLd data={faqLd(FAQS.flatMap((faq) => (typeof faq.answer === "string" ? [{ question: faq.question, answer: faq.answer }] : [])))} />
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-[40px] sm:leading-tight">Frequently asked questions</h1>
        <p className="mt-3 text-slate-600">Everything students usually ask before they start.</p>
      </header>
      <FaqList />
    </div>
  );
}
