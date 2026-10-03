import type { Metadata } from "next";
import { PricingPlans } from "./pricing-plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "SAT Sharks plans in PKR for Pakistan and USD for international students. Start free.",
};

export default function PricingPage() {
  return (
    <div className="py-6 sm:py-10">
      <header className="mx-auto mb-8 max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-[40px] sm:leading-tight">Simple plans for every SAT timeline</h1>
        <p className="mt-3 text-slate-600">Start free with two full papers. Upgrade when you want every paper and unlimited practice.</p>
      </header>
      <PricingPlans />
    </div>
  );
}
