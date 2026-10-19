import type { Metadata } from "next";
import { PRICING_ALTERNATES, PricingPage } from "@/components/pricing-page";

export const metadata: Metadata = {
  title: "SAT prep prices in Pakistan (PKR)",
  description: "SAT Sharks plans for students in Pakistan, in Pakistani rupees: start free, then Monthly or 3 Months with every past Digital SAT paper and full analytics.",
  alternates: { canonical: "/pricing/pakistan", languages: PRICING_ALTERNATES },
  openGraph: { title: "SAT Sharks prices in Pakistan (PKR)", url: "/pricing/pakistan", locale: "en_PK" },
};

export default function PricingPakistan() {
  return (
    <PricingPage
      currency="PKR"
      path="/pricing/pakistan"
      title="SAT prep prices in Pakistan"
      subtitle="Plans in Pakistani rupees for students in Pakistan. Start free with two full past papers; upgrade when you want every paper."
    />
  );
}
