import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_PRICING, type PricingContent } from "@satsharks/types";
import { ContactLine, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "SAT Sharks refund policy: what happens when you cancel, and what to do if a payment goes wrong.",
  alternates: { canonical: "/refund" },
};

// The policy line itself is the one SAT Sharks sets in Admin → Settings (pricing), so this page and
// the pricing page always say the same thing.
async function refundLine(): Promise<string> {
  try {
    const response = await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/api/pricing`, { next: { revalidate: 600 }, signal: AbortSignal.timeout(4000) });
    const body = (await response.json()) as { ok: boolean; data?: PricingContent };
    return (body.ok && body.data?.refundPolicy) || DEFAULT_PRICING.refundPolicy;
  } catch {
    return DEFAULT_PRICING.refundPolicy;
  }
}

export default async function RefundPage() {
  const policy = await refundLine();
  return (
    <LegalPage
      title="Refund Policy"
      intro={<p className="font-bold">{policy}</p>}
      sections={[
        {
          heading: "Try before you pay",
          body: (
            <p>
              The free plan lets you sit full past papers, practise drills and see your score before you spend anything, so you can decide whether SAT Sharks suits you. See the{" "}
              <Link href="/pricing" className="font-bold text-brand-500 hover:underline">
                pricing page
              </Link>{" "}
              for what each plan includes.
            </p>
          ),
        },
        {
          heading: "Cancelling",
          body: (
            <p>
              Nothing is charged automatically. You can cancel renewal reminders any time with one click on your billing page. Your plan then stays active until the end of the period
              you paid for and moves to the free plan afterwards; your scores, history and streak are kept.
            </p>
          ),
        },
        {
          heading: "If a payment goes wrong",
          body: (
            <>
              <p>
                If you paid twice for the same plan by mistake, a transfer you made was not approved, or your account was not upgraded after paying, message us on WhatsApp with your
                receipt number or transaction ID. We check every case and will sort it out with you.
              </p>
              <ContactLine />
            </>
          ),
        },
      ]}
    />
  );
}
