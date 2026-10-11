import type { Metadata } from "next";
import { FaqList } from "@/components/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about SAT Sharks: real past papers, the free plan, the Bluebook-style test screen and more.",
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl py-6 sm:py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-[40px] sm:leading-tight">Frequently asked questions</h1>
        <p className="mt-3 text-slate-600">Everything students usually ask before they start.</p>
      </header>
      <FaqList />
    </div>
  );
}
