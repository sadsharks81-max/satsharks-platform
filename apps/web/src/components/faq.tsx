import Link from "next/link";
import type { ReactNode } from "react";

// Wording supplied by SAT Sharks (2026-10-11), used as written.
export const FAQS: { question: string; answer: ReactNode }[] = [
  {
    question: "Why not just use Bluebook's free practice tests?",
    answer:
      "You should use them. But Bluebook has only a few tests, and you will finish them quickly. We give you many more real past papers, drills for the topics you find hard, and a clear review that shows where you lose points.",
  },
  {
    question: "Do SAT questions really repeat?",
    answer:
      "Yes. Not word for word, but the same ideas come back again and again. The numbers and passages change, but the concept stays the same. The more past papers you practise, the easier these questions will feel on test day.",
  },
  {
    question: "Are these real past SAT papers?",
    answer: "Yes. Every test here comes from real past Digital SAT exams. We have 26 papers so far, and we add new ones often.",
  },
  {
    question: "Is it free to use?",
    answer:
      "Yes. You can start for free, and you don't need a card. You get 2 full past papers, 20 practice questions a day, and an explanation for every answer. Pro gives you every paper, unlimited practice and a full report on your weak areas.",
  },
  {
    question: "Is it like the real Bluebook test?",
    answer:
      "Yes. It looks and works the same way, with the same tools, like the Desmos calculator, reference sheet and timer. Reading & Writing has 2 modules of 27 questions (32 minutes each). Then you get a 10-minute break. Math has 2 modules of 22 questions (35 minutes each). Just like the real test, the second module gets easier or harder based on how you did in the first one.",
  },
  {
    question: "Can I practise on my phone?",
    answer: "Yes, it works on your phone, and it's great for quick practice. For full tests, use a laptop or tablet if you can. That's what you will use on test day.",
  },
  {
    question: "What if my internet stops during a test?",
    answer: "Don't worry. Your test saves by itself. Open it again and you will start from the same question, with the same time left.",
  },
  {
    question: "How much is Pro, and how do I pay?",
    answer: (
      <>
        You can see all plans and prices on the{" "}
        <Link href="/pricing" className="font-bold text-brand-500 hover:underline">
          Pricing page
        </Link>
        . You can pay with a debit or credit card, and Pro starts right after you pay.
      </>
    ),
  },
  {
    question: "Can I cancel any time?",
    answer: "Yes. You can cancel with one click.",
  },
  {
    question: "Are you part of College Board?",
    answer: "No. We are an independent website. SAT is a trademark of the College Board, which is not linked to this website and does not endorse it.",
  },
];

// Questions open and close in place (<details>, so it works without JavaScript). "landing" matches
// the landing page's rounded cards; "site" the rest of the site's black-bordered cards.
export function FaqList({ tone = "site" }: { tone?: "landing" | "site" }) {
  const item =
    tone === "landing"
      ? "group rounded-[20px] border border-[#DDE2F1] bg-white px-5 shadow-[0_20px_40px_-34px_rgba(31,45,140,0.45)] open:border-brand-500/40 sm:px-7"
      : "group rounded-2xl border border-slate-900 bg-white px-5";
  const question = tone === "landing" ? "text-[17px] font-bold sm:text-lg" : "text-base font-bold text-black";
  const answer = tone === "landing" ? "text-base leading-relaxed text-[#4D5577]" : "text-sm leading-relaxed text-slate-600";

  return (
    <div className="flex flex-col gap-3">
      {FAQS.map((faq) => (
        <details key={faq.question} className={item}>
          <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 py-4 sm:py-5 [&::-webkit-details-marker]:hidden ${question}`}>
            {faq.question}
            <span aria-hidden className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-500 transition-transform group-open:rotate-45">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </summary>
          <p className={`m-0 pb-5 pr-10 ${answer}`}>{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
