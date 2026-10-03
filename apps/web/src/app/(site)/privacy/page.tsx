import type { Metadata } from "next";
import { ContactLine, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy", description: "What SAT Sharks collects, why, and who it is shared with." };

// Every statement here describes what the code does today (see docs/database.md and the API).
// Not reviewed by a lawyer: SAT Sharks should have it checked before launch, and update it when
// payments, analytics or new email types are added.
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={<p>This page explains what SAT Sharks collects when you use the site, why, and who else handles it.</p>}
      sections={[
        {
          heading: "What we collect",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <b>Account details:</b> your name, email address and country. Your password is stored only as a one-way hash, never in readable form.
              </li>
              <li>
                <b>Practice activity:</b> the drills and tests you start, your answers, questions you mark for review, time spent on each question and module, and your scores.
              </li>
              <li>
                <b>Problem reports:</b> the reason and any details you write when you report a question.
              </li>
              <li>
                <b>Technical data:</b> our server logs record each request&apos;s address, time and result, and may include your IP address and browser type.
              </li>
            </ul>
          ),
        },
        {
          heading: "Why we use it",
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>To run your account and keep you signed in.</li>
              <li>To save your progress, score your tests and show your results.</li>
              <li>To show plans in your currency (PKR in Pakistan, USD elsewhere), based on the country you chose.</li>
              <li>To send you a password reset email when you ask for one.</li>
              <li>To review and fix questions you report.</li>
              <li>To keep the site secure, for example by limiting repeated log-in attempts.</li>
            </ul>
          ),
        },
        {
          heading: "Cookies",
          body: (
            <p>
              We use one cookie, which keeps you signed in. It cannot be read by scripts on the page and expires after 7 days or when you sign out. We do not use advertising or tracking
              cookies.
            </p>
          ),
        },
        {
          heading: "Who else handles your data",
          body: (
            <>
              <p>We do not sell your data. A few services process it for us:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <b>MongoDB Atlas</b> stores the database.
                </li>
                <li>
                  <b>Resend</b> delivers password reset emails, so it receives your email address and the email&apos;s content.
                </li>
                <li>
                  <b>Desmos</b> provides the graphing calculator in Math sections. It loads from desmos.com when you open the calculator.
                </li>
                <li>Our hosting providers run the website and its server.</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Your choices",
          body: (
            <>
              <p>You can ask to see, correct or delete your account and its data.</p>
              <ContactLine />
            </>
          ),
        },
        {
          heading: "Changes to this policy",
          body: <p>When we change what we collect or who handles it, we will update this page. The date at the top shows the latest version.</p>,
        },
      ]}
    />
  );
}
