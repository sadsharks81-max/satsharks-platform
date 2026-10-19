import type { Metadata } from "next";
import { headers } from "next/headers";
import { PRICING_ALTERNATES, PricingPage } from "@/components/pricing-page";

export const metadata: Metadata = {
  title: "Pricing",
  description: "SAT Sharks plans in PKR for Pakistan and USD for international students. Start free with two full past papers; upgrade for every paper and full analytics.",
  alternates: { canonical: "/pricing", languages: PRICING_ALTERNATES },
  openGraph: { title: "SAT Sharks pricing", description: "Plans in PKR for Pakistan and USD worldwide. Start free.", url: "/pricing" },
};

// The currency of the country the visitor browses from (Vercel's IP country header); students who
// are signed in see their account's currency instead, and the switch on the page always works.
export default async function Pricing() {
  const country = (await headers()).get("x-vercel-ip-country");
  const currency = country ? (country.toUpperCase() === "PK" ? "PKR" : "USD") : null;
  return (
    <PricingPage
      currency={currency}
      path="/pricing"
      title="Simple plans for every SAT timeline"
      subtitle="Start free with two full papers. Upgrade when you want every paper and unlimited practice."
    />
  );
}
