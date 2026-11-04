import type { Metadata } from "next";
import { PRICING_ALTERNATES, PricingPage } from "@/components/pricing-page";

export const metadata: Metadata = {
  title: "SAT prep prices for international students (USD)",
  description: "LUE SAT plans for students outside Pakistan, in US dollars: start free, then Monthly or 3 Months with every past Digital SAT paper and full analytics.",
  alternates: { canonical: "/pricing/international", languages: PRICING_ALTERNATES },
  openGraph: { title: "LUE SAT prices for international students (USD)", url: "/pricing/international" },
};

export default function PricingInternational() {
  return (
    <PricingPage
      currency="USD"
      path="/pricing/international"
      title="SAT prep prices for international students"
      subtitle="Plans in US dollars for students everywhere outside Pakistan. Start free with two full past papers."
    />
  );
}
