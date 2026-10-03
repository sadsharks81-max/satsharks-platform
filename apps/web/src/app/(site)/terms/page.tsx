import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of Service", description: "The terms for using SAT Sharks." };

// Written from what the site does today. Not reviewed by a lawyer: SAT Sharks should have it
// checked before launch, and add payment and refund terms when paid plans go live.
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={<p>These terms apply when you use the SAT Sharks website to practise for the Digital SAT. By creating an account, you agree to them.</p>}
      sections={[
        {
          heading: "Your account",
          body: (
            <>
              <p>Give your real name, an email address you can read, and the country you live in. Your country decides whether you see local (PKR) or international (USD) plans.</p>
              <p>Keep your password private. You are responsible for what happens under your account. If you forget your password, use &ldquo;Forgot password&rdquo; on the log-in page.</p>
              <p>We may suspend an account that is used to break these terms.</p>
            </>
          ),
        },
        {
          heading: "Using the practice material",
          body: (
            <>
              <p>Questions, explanations and tests on SAT Sharks are for your own study. Do not copy, publish, sell or share them, and do not use automated tools to download or collect them.</p>
              <p>Do not try to get around limits, read answers before submitting, or disrupt the site for other students.</p>
            </>
          ),
        },
        {
          heading: "Scores are practice scores",
          body: (
            <>
              <p>
                Section scores (200–800) and total scores (400–1600) shown here are calculated from conversion tables set by SAT Sharks. They are estimates to guide your practice, not official
                scores, and they do not predict or guarantee any result on the real test.
              </p>
              <p>SAT is a trademark registered by the College Board, which is not affiliated with, and does not endorse, SAT Sharks.</p>
            </>
          ),
        },
        {
          heading: "Reporting problems",
          body: <p>If a question looks wrong, use &ldquo;Report a problem&rdquo; on that question. Our team reviews every report and may correct the question.</p>,
        },
        {
          heading: "Plans and payments",
          body: (
            <p>
              The plans on the{" "}
              <Link href="/pricing" className="font-bold text-brand-500 hover:underline">
                pricing page
              </Link>{" "}
              are not yet available to buy, and SAT Sharks takes no payments today. Terms for paid plans, renewals, cancellations and refunds will be published before payments start.
            </p>
          ),
        },
        {
          heading: "Changes to these terms",
          body: (
            <>
              <p>We may update these terms as the site grows. The date at the top shows the latest version.</p>
              <ContactLine />
            </>
          ),
        },
      ]}
    />
  );
}
