import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HomeActions } from "@/components/home-actions";

export const metadata: Metadata = {
  title: { absolute: "SAT Sharks — Digital SAT practice on real past papers" },
  description: "Full-length adaptive Digital SAT practice tests and focused drills from 26 past SAT exams, in a Bluebook-style test screen, scored 400–1600.",
};

// Every figure on this page must be true (proposal: "every number on screen must be true").
// The bank figures below were counted on 2026-10-03 (9,927 published questions: 7,720 Reading &
// Writing, 2,207 Math, from 26 exams, 8 topics, 29 skills). Rounded down, so they stay true as the
// bank grows; update them if questions are ever removed.
const BANK_FACTS = [
  { value: "9,900+", label: "practice questions" },
  { value: "26", label: "past SAT exams" },
  { value: "29", label: "skills across 8 topics" },
  { value: "400–1600", label: "real score scale" },
];

const ICON = {
  adapt: <path d="M4 18l5-6 4 4 7-9M15 7h5v5" />,
  tools: <path d="M5 3h14v18H5zM8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 19h8" />,
  score: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  review: <path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />,
  target: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />,
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" />,
  flag: <path d="M5 21V4m0 0h11l-2 4 2 4H5" />,
} as const;

const FEATURES: { icon: keyof typeof ICON; title: string; text: string }[] = [
  { icon: "adapt", title: "Adaptive, like test day", text: "Module 2 gets harder or easier depending on how you did in Module 1, exactly as the Digital SAT routes you." },
  { icon: "tools", title: "Bluebook-style tools", text: "Desmos graphing calculator, reference sheet, timer, mark for review, answer eliminator and a question menu." },
  { icon: "score", title: "Scored on the real scale", text: "Each section is scored 200–800 and the full test 400–1600, with correct, incorrect and skipped counts per module." },
  { icon: "review", title: "Review every answer", text: "See your answer next to the correct one, filter to the questions you got wrong or skipped, and see the time you spent on each." },
  { icon: "flag", title: "Report a problem", text: "Spot something wrong in a question? Report it in one click from the test or your results, and our team checks and fixes it." },
  { icon: "clock", title: "Extended time", text: "Approved for accommodations? Take any test with 1.5× or 2× time on every module." },
];

const STEPS = [
  { title: "Create a free account", text: "Sign up in under a minute. No card needed." },
  { title: "Take a test or a drill", text: "A full adaptive test, one section, or a focused drill on your weak topics." },
  { title: "Review and improve", text: "See your scores, module by module, and learn from every question you missed." },
];

function Icon({ name }: { name: keyof typeof ICON }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
      <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {ICON[name]}
      </svg>
    </span>
  );
}

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-bold uppercase tracking-wide text-brand-600">{eyebrow}</p>
      <h2 className="mt-2 text-[28px] font-bold leading-tight tracking-tight sm:text-4xl">{title}</h2>
      {children && <p className="mt-3 text-slate-600">{children}</p>}
    </div>
  );
}

// A picture of the test screen, drawn with the site's own styles (not a screenshot), so it stays
// sharp at every size and matches the real thing.
function TestScreenPreview() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[560px]">
      <div className="absolute -inset-4 -z-10 rounded-[28px] bg-brand-100/70 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-slate-900 bg-white shadow-[0_20px_50px_-20px_rgba(34,52,137,0.45)]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3">
          <div>
            <p className="text-sm font-bold">Math: Module 1</p>
            <p className="text-xs text-slate-600">Directions ▾</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums">31:58</p>
            <span className="rounded-full border border-slate-900 px-2.5 text-[10px] font-bold">Hide</span>
          </div>
          <div className="flex justify-end gap-3 text-[10px] font-medium text-slate-700">
            <span className="flex flex-col items-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="5" y="2.5" width="14" height="19" rx="2" />
                <path d="M8 6.5h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01" />
              </svg>
              Calculator
            </span>
            <span className="hidden flex-col items-center sm:flex">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 7l6 10M10 7L4 17M14 9c0-1.4 1-2.3 2.3-2.3 1.2 0 2.2.8 2.2 2 0 2-4.5 3.3-4.5 5.3h4.7" />
              </svg>
              Reference
            </span>
          </div>
        </div>
        <div className="test-rule" />
        <div className="px-5 py-5">
          <div className="flex items-center gap-3 bg-slate-100">
            <span className="flex h-8 w-8 items-center justify-center bg-slate-900 text-sm font-bold text-white">4</span>
            <span className="text-xs font-medium">⚐ Mark for Review</span>
            <span className="ml-auto mr-2 rounded border border-slate-900 px-1 text-[10px] font-bold line-through">ABC</span>
          </div>
          <p className="question-text mt-4 text-[15px]">
            If <i>3x</i> + 5 = 20, what is the value of <i>x</i>?
          </p>
          <div className="mt-4 space-y-2.5">
            {["3", "5", "8", "15"].map((choice, index) => {
              const selected = index === 1;
              return (
                <div key={choice} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${selected ? "border-2 border-brand-500" : "border-slate-900"}`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${selected ? "border-brand-500 bg-brand-500 text-white" : "border-slate-900"}`}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="question-text text-[15px]">{choice}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="test-rule" />
        <div className="flex items-center justify-between px-4 py-3">
          <span className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Question 4 of 22 ▴</span>
          <span className="flex gap-2">
            <span className="rounded-full bg-brand-500 px-4 py-1.5 text-xs font-bold text-white">Back</span>
            <span className="rounded-full bg-brand-500 px-4 py-1.5 text-xs font-bold text-white">Next</span>
          </span>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-3 hidden rounded-xl border border-slate-900 bg-white px-4 py-3 shadow-lg sm:block">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Module 2</p>
        <p className="text-sm font-bold text-brand-600">Adapts to your score</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-20 pb-8 sm:gap-28">
      {/* Hero */}
      <section className="grid items-center gap-12 pt-6 sm:pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* Bottom padding (side-by-side layout only) lifts the vertically centred text a little, so
            it lines up with the upper part of the test-screen picture. Spacing inside is unchanged. */}
        <div className="text-center lg:pb-12 lg:text-left">
          <h1 className="text-[38px] font-black leading-[1.08] tracking-tight sm:text-[54px] xl:text-[62px]">
            Practise the Digital SAT on <span className="text-brand-500">real past papers</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-slate-600 lg:mx-0">
            Full-length adaptive tests and focused drills in a test screen that works like Bluebook, scored on the real 400–1600 scale.
          </p>
          <HomeActions className="mt-8 justify-center lg:justify-start" />
          <p className="mt-4 text-sm text-slate-500">Free to start · No card needed · Works on laptop and phone</p>
        </div>
        <TestScreenPreview />
      </section>

      {/* Question bank facts */}
      {/* The 1px gaps over a grey background draw even dividers in both the 2- and 4-column layouts. */}
      <section className="overflow-hidden rounded-2xl border border-slate-900 bg-white">
        <dl className="grid grid-cols-2 gap-px bg-slate-200 lg:grid-cols-4">
          {BANK_FACTS.map((fact) => (
            <div key={fact.label} className="bg-white px-5 py-6 text-center sm:py-8">
              <dd className="text-3xl font-black tracking-tight text-brand-600 sm:text-4xl">{fact.value}</dd>
              <dt className="mt-1 text-sm font-medium text-slate-600">{fact.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Features */}
      <section>
        <SectionHeading eyebrow="Why SAT Sharks" title="Everything you need to walk in ready">
          The same structure, tools and timing as the real test, plus the review that shows you where your points went.
        </SectionHeading>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-slate-900 bg-white p-6">
              <Icon name={feature.icon} />
              <h3 className="mt-4 text-lg font-bold">{feature.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Test format */}
      <section>
        <SectionHeading eyebrow="Two ways to practise" title="Full tests and focused drills">
          Sit a complete adaptive test exactly like test day, or drill the topics you need most.
        </SectionHeading>
        <h3 className="mt-12 flex items-center gap-3 text-lg font-bold">
          <span className="rounded-full bg-brand-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Adaptive mock test</span>
          <span className="text-sm font-medium text-slate-600">Two sections, each in two modules, with a break in between</span>
        </h3>
        <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
          {[
            { name: "Reading and Writing", questions: "2 modules × 27 questions", time: "32 minutes per module", extra: "Short passages with one question each: craft, structure, information, ideas and conventions." },
            { name: "Math", questions: "2 modules × 22 questions", time: "35 minutes per module", extra: "Algebra, advanced math, data analysis, geometry and trigonometry. Calculator and reference sheet built in." },
          ].map((section, index) => (
            <div key={section.name} className={`rounded-2xl border border-slate-900 bg-white p-6 sm:p-8 ${index === 1 ? "lg:order-3" : ""}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Section {index + 1}</p>
              <h3 className="mt-1 text-2xl font-bold">{section.name}</h3>
              <ul className="mt-4 space-y-2 text-[15px]">
                <li className="flex gap-2">
                  <span className="text-brand-500">●</span>
                  {section.questions}
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-500">●</span>
                  {section.time}
                </li>
                <li className="flex gap-2">
                  <span className="text-brand-500">●</span>
                  Scored 200–800
                </li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{section.extra}</p>
            </div>
          ))}
          <div className="flex items-center justify-center lg:order-2">
            <span className="rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white">10-minute break</span>
          </div>
        </div>

        <h3 className="mt-10 flex items-center gap-3 text-lg font-bold">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Practice drill</span>
          <span className="text-sm font-medium text-slate-600">Short, targeted sets from any past exam</span>
        </h3>
        <div className="mt-4 grid gap-6 rounded-2xl border border-slate-900 bg-white p-6 sm:p-8 lg:grid-cols-[1fr_1.6fr] lg:items-center">
          <div>
            <h3 className="text-2xl font-bold">Practise exactly what you need</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
              Build a drill in seconds from any of the 26 past exams, in Reading and Writing or Math. Check each answer as you go, then review the whole set.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { title: "Pick the content", text: "Choose the section, the topics and the exact skills." },
              { title: "Set the challenge", text: "Easy or hard questions, and as many as you want." },
              { title: "Instant answer check", text: "Check each answer straight away while you practise." },
              { title: "Your pace", text: "Untimed, or with a countdown you set yourself." },
              { title: "Only new questions", text: "Optionally leave out questions you have already answered." },
              { title: "Same test screen", text: "Calculator, reference sheet and every Bluebook-style tool." },
            ].map((point) => (
              <li key={point.title} className="flex gap-3 rounded-xl bg-slate-50 p-4">
                <span aria-hidden className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-500 text-[11px] font-black text-white">
                  ✓
                </span>
                <span>
                  <span className="block text-sm font-bold">{point.title}</span>
                  <span className="text-sm text-slate-600">{point.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section>
        <SectionHeading eyebrow="How it works" title="From sign-up to your first score in minutes" />
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative rounded-2xl border border-slate-900 bg-white p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-lg font-black text-white">{index + 1}</span>
              <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-[15px] text-slate-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Closing call to action */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-500 px-6 py-14 text-center text-white sm:px-12 sm:py-16">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-white/5" />
        <h2 className="relative text-[28px] font-bold leading-tight tracking-tight sm:text-4xl">Your next practice test is one click away</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-white/85">Create a free account and take a full adaptive Digital SAT today.</p>
        <HomeActions variant="band" className="relative mt-8 justify-center" />
      </section>
    </div>
  );
}
