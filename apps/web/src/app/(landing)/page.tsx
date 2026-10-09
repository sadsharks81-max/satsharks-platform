import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Announcements } from "@/components/announcements";
import { HomeActions } from "@/components/home-actions";
import { LandingTestDemo } from "@/components/landing-test-demo";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: { absolute: "SAT Sharks | Digital SAT practice on real past papers" },
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

const STEPS = [
  {
    title: "Create a free account",
    text: "Sign up in under a minute. No card needed.",
  },
  {
    title: "Take a test or a drill",
    text: "A full adaptive test, one section, or a focused drill on your weak topics.",
  },
  {
    title: "Review and improve",
    text: "See your scores, module by module, and learn from every question you missed.",
  },
];

const DRILL_POINTS: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: "Pick the content",
    text: "Choose the section, the topics and the exact skills.",
    icon: <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />,
  },
  {
    title: "Set the challenge",
    text: "Easy or hard questions, and as many as you want.",
    icon: (
      <>
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="10" cy="17" r="2" />
      </>
    ),
  },
  {
    title: "Instant answer check",
    text: "Check each answer straight away while you practise.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12l3 3 5-6" />
      </>
    ),
  },
  {
    title: "Your pace",
    text: "Untimed, or with a countdown you set yourself.",
    icon: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5M9 2h6" />
      </>
    ),
  },
  {
    title: "Only new questions",
    text: "Optionally leave out questions you have already answered.",
    icon: <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />,
  },
  {
    title: "Same test screen",
    text: "Calculator, reference sheet and every Bluebook-style tool.",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>
    ),
  },
];

// Features without a picture of their own, shown under the three illustrated cards.
const MORE_FEATURES: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: "Review every answer",
    text: "See your answer next to the correct one, filter to the questions you got wrong or skipped, and see the time you spent on each.",
    icon: <path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />,
  },
  {
    title: "Report a problem",
    text: "Spot something wrong in a question? Report it in one click from the test or your results, and our team checks and fixes it.",
    icon: <path d="M5 21V4m0 0h11l-2 4 2 4H5" />,
  },
  {
    title: "Extended time",
    text: "Approved for accommodations? Take any test with 1.5× or 2× time on every module.",
    icon: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" />,
  },
];

const container = "mx-auto w-full max-w-[1320px] px-4 sm:px-8";
const card = "landing-lift rounded-[28px] border border-[#DDE2F1] bg-white";

function Svg({ children, className = "h-5 w-5", stroke = "currentColor", strokeWidth = 2 }: { children: ReactNode; className?: string; stroke?: string; strokeWidth?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

// The fin and wave from the logo, as in the landing design.
function Fin({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={className} fill="none">
      <path d="M6 30 C 15 26, 21 15, 18 5 C 28 11, 34 21, 35 30 Z" fill="#fff" />
      <path d="M3 34 C 9 31, 13 37, 20 34 S 31 31, 37 34" stroke="#BFCBFF" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="text-[13px] font-extrabold tracking-[0.14em] text-brand-500">{eyebrow}</span>
      <h2 className="m-0 max-w-[860px] text-balance text-[clamp(32px,4.6vw,60px)] font-extrabold leading-[1.04] tracking-[-0.045em]">{title}</h2>
      {children && <p className="m-0 max-w-[640px] text-[17px] leading-relaxed text-[#4D5577] sm:text-lg">{children}</p>}
    </div>
  );
}

// A floating tool callout beside the laptop (wide screens only).
function Callout({ title, text, icon, className }: { title: string; text: string; icon: ReactNode; className: string }) {
  return (
    <div
      className={`landing-bob absolute z-[4] hidden items-center gap-2.5 rounded-[14px] bg-white py-2.5 pl-2.5 pr-4 shadow-[0_16px_36px_-18px_rgba(10,16,60,0.55)] min-[1260px]:flex ${className}`}
    >
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#EEF1FF] text-brand-500">{icon}</span>
      <span className="flex flex-col">
        <strong className="text-sm">{title}</strong>
        <span className="text-xs text-[#4D5577]">{text}</span>
      </span>
    </div>
  );
}

// The phone beside the laptop: a drill question with its instant answer check.
function PhoneDrill() {
  const option = "flex items-center gap-2 rounded-lg border-[1.5px] border-[#0F1535] px-2.5 py-2 text-[13px]";
  const letter = "flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-[#0F1535] text-[10px] font-extrabold";
  return (
    <div
      aria-hidden
      className="landing-rise absolute bottom-0 z-[4] hidden w-[228px] origin-bottom-right scale-[0.85] rounded-[38px] bg-[#10163D] p-2.5 shadow-[0_40px_70px_-30px_rgba(8,12,48,0.8),inset_0_0_0_1px_rgba(255,255,255,0.1)] [animation-delay:0.25s] min-[720px]:right-2 min-[720px]:block min-[1100px]:left-[calc(50%+290px)] min-[1100px]:right-auto min-[1100px]:scale-100"
    >
      <div className="flex flex-col overflow-hidden rounded-[29px] bg-white text-[#0F1535]">
        <div className="flex justify-center pt-2">
          <span className="h-5 w-[70px] rounded-full bg-[#10163D]" />
        </div>
        <div className="flex items-center justify-between px-3.5 pb-2 pt-3">
          <strong className="text-xs">Practice drill · Algebra</strong>
          <span className="text-[11px] font-bold text-[#4D5577]">3 / 10</span>
        </div>
        <div className="mx-3.5 h-1 overflow-hidden rounded bg-[#E6E9F4]">
          <div className="h-full w-[30%] bg-brand-500" />
        </div>
        <div className="flex flex-col gap-2 p-3.5">
          <p className="question-text mb-1 text-sm leading-snug">
            If 2<i>x</i> − 4 = 10, what is the value of <i>x</i>?
          </p>
          <div className={option}>
            <span className={letter}>A</span>3
          </div>
          <div className="flex items-center gap-2 rounded-lg border-2 border-[#12784A] bg-[#E7F5EE] px-2.5 py-2 text-[13px] font-bold">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#12784A]">
              <Svg className="h-2.5 w-2.5" stroke="#fff" strokeWidth={3.5}>
                <path d="M5 12l5 5L20 7" />
              </Svg>
            </span>
            7
          </div>
          <div className={option}>
            <span className={letter}>C</span>9
          </div>
          <div className={option}>
            <span className={letter}>D</span>14
          </div>
          <div className="mt-1 flex flex-col gap-0.5 rounded-[10px] bg-[#12784A] p-2.5 text-white">
            <strong className="flex items-center gap-1.5 text-xs">
              <span className="landing-blink h-[7px] w-[7px] rounded-full bg-[#9BF0C4]" />
              Instant answer check
            </strong>
            <span className="text-[11px] leading-snug text-[#DDF6E9]">Correct: 2x = 14, so x = 7.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(900px_500px_at_50%_0%,#4A5FE0_0%,rgba(52,72,197,0)_70%),linear-gradient(180deg,#3448C5_0%,#2A3BB0_55%,#22309A_100%)]">
      {/* Grid lines, rings and the curve the page continues from. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_30%,#000_30%,transparent_80%)]"
      />
      <div aria-hidden className="absolute -left-[180px] top-[220px] h-[520px] w-[520px] rounded-full border border-white/[0.12]" />
      <div aria-hidden className="absolute -left-[300px] top-[100px] h-[760px] w-[760px] rounded-full border border-white/[0.08]" />
      <div aria-hidden className="absolute -right-[220px] top-10 h-[600px] w-[600px] rounded-full border border-white/10" />
      <div
        aria-hidden
        className="absolute -left-[10%] -right-[10%] bottom-0 z-[1] h-[150px] rounded-t-[50%_60px] bg-[#F7F8FC] sm:h-[240px] sm:rounded-t-[50%_90px] lg:h-[330px] lg:rounded-t-[50%_120px]"
      />

      <div className="relative z-30 mx-auto max-w-[1700px] sm:pt-2">
        <Nav tone="brand" />
      </div>
      <div className={`relative z-[3] ${container} mt-4 empty:hidden`}>
        <Announcements />
      </div>

      {/* Headline */}
      <div className="relative z-[3] mx-auto flex max-w-[1040px] flex-col items-center gap-6 px-4 pb-12 pt-8 text-center sm:gap-[26px] sm:px-8 sm:pb-14 sm:pt-14">
        <span className="flex items-center gap-2.5 rounded-full border border-white/25 bg-white/[0.12] py-2 pl-2 pr-4 text-[13px] font-semibold text-white sm:text-sm">
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-brand-700 sm:text-xs">ADAPTIVE</span>
          Module 2 adapts to your score
        </span>
        <h1 className="m-0 text-balance text-[clamp(40px,7vw,96px)] font-extrabold leading-[0.98] tracking-[-0.05em] text-white">
          Practise the Digital SAT on{" "}
          <span className="relative whitespace-nowrap text-[#C9D3FF]">
            real past papers
            <svg aria-hidden viewBox="0 0 300 18" preserveAspectRatio="none" className="absolute -bottom-3.5 left-0 h-[18px] w-full">
              <path d="M3 12 C 60 2, 120 2, 160 9 S 250 16, 297 5" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </h1>
        <p className="m-0 max-w-[640px] text-pretty text-[17px] leading-relaxed text-[#DCE2FF] sm:text-xl">
          Full-length adaptive tests and focused drills in a test screen that works like Bluebook, scored on the real 400–1600 scale.
        </p>
        <div className="flex w-full flex-col items-center gap-3.5">
          <HomeActions className="w-full justify-center sm:w-auto" />
          <span className="text-[13px] font-medium text-[#C9D3FF] sm:text-sm">Free to start · No card needed · Works on laptop and phone</span>
        </div>
      </div>

      {/* Stage: laptop, phone and tool callouts */}
      <div className="relative z-[2] mx-auto max-w-[1240px] px-4 pb-14 sm:px-6 sm:pb-20">
        <div
          aria-hidden
          className="absolute left-1/2 top-10 h-[500px] w-[min(900px,100%)] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(170,185,255,0.55),rgba(170,185,255,0))] blur-[20px]"
        />
        <Callout
          className="right-[calc(50%+405px)] top-[70px]"
          title="Timer"
          text="Same timing as test day"
          icon={
            <Svg className="h-[18px] w-[18px]">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 2.5M9 2h6" />
            </Svg>
          }
        />
        <Callout
          className="right-[calc(50%+425px)] top-[215px] [animation-delay:-2s]"
          title="Mark for review"
          text="Flag it, come back later"
          icon={
            <Svg className="h-[18px] w-[18px]">
              <path d="M5 21V4h11l-1.5 4L16 12H5" />
            </Svg>
          }
        />
        <Callout
          className="right-[calc(50%+405px)] top-[360px] [animation-delay:-4s]"
          title="Answer eliminator"
          text="Cross out wrong choices"
          icon={<span className="text-[11px] font-extrabold line-through">ABC</span>}
        />
        <Callout
          className="left-[calc(50%+405px)] top-10 [animation-delay:-2s]"
          title="Desmos calculator"
          text="Graphing, built in"
          icon={
            <Svg className="h-[18px] w-[18px]">
              <path d="M3 20h18M4 16c4 0 5-11 8-11s4 11 8 11" />
            </Svg>
          }
        />
        <Callout
          className="left-[calc(50%+425px)] top-[170px] [animation-delay:-4s]"
          title="Reference sheet"
          text="Every formula, one tap"
          icon={<span className="question-text text-[15px] font-semibold">x²</span>}
        />
        <LandingTestDemo />
        <PhoneDrill />
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className={`${container} pt-6`}>
      {/* The 1px gaps over a pale background draw the dividers in both the 2- and 4-column layouts. */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[28px] border border-[#DDE2F1] bg-[#E6E9F4] shadow-[0_30px_60px_-40px_rgba(31,45,140,0.35)] lg:grid-cols-4">
        {BANK_FACTS.map((fact, index) => {
          const last = index === BANK_FACTS.length - 1;
          return (
            <div key={fact.label} className={`flex flex-col gap-1.5 px-5 py-7 sm:px-8 sm:py-9 ${last ? "bg-brand-500" : "bg-white"}`}>
              <dd className={`m-0 whitespace-nowrap text-[clamp(26px,3.8vw,52px)] font-extrabold leading-none tracking-[-0.045em] ${last ? "text-white" : "text-brand-700"}`}>{fact.value}</dd>
              <dt className={`text-sm font-semibold sm:text-base ${last ? "text-[#DCE2FF]" : "text-[#4D5577]"}`}>{fact.label}</dt>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function FeatureCard({ picture, title, text }: { picture: ReactNode; title: string; text: string }) {
  return (
    <div className={`${card} flex flex-col p-3.5`}>
      <div className="flex h-[210px] items-center justify-center rounded-[18px] bg-[radial-gradient(circle_at_30%_20%,#F4F6FF_0%,#E6EAFE_100%)]">{picture}</div>
      <div className="flex flex-col gap-2.5 px-3.5 pb-4 pt-6">
        <h3 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">{title}</h3>
        <p className="m-0 text-base leading-relaxed text-[#4D5577]">{text}</p>
      </div>
    </div>
  );
}

function ToolTile({ label, children, strong = false }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl ${
        strong ? "bg-brand-500 text-white shadow-[0_8px_18px_-10px_rgba(31,45,140,0.8)]" : "bg-white text-brand-500 shadow-[0_8px_18px_-12px_rgba(31,45,140,0.5)]"
      }`}
    >
      {children}
      <span className={`text-[11px] font-bold ${strong ? "text-[#DCE2FF]" : "text-[#0F1535]"}`}>{label}</span>
    </div>
  );
}

function Why() {
  return (
    <section className={`${container} flex flex-col gap-14 pt-24 sm:pt-[140px]`}>
      <SectionHeading eyebrow="WHY SAT SHARKS" title="Everything you need to walk in ready">
        The same structure, tools and timing as the real test, plus the review that shows you where your points went.
      </SectionHeading>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="Adaptive, like test day"
          text="Module 2 gets harder or easier depending on how you did in Module 1, exactly as the Digital SAT routes you."
          picture={
            <div aria-hidden className="flex items-center gap-1 px-4">
              <div className="flex flex-col gap-0.5 rounded-xl bg-[#10163D] p-3 text-white shadow-[0_12px_24px_-14px_rgba(8,12,48,0.6)] sm:p-3.5">
                <span className="text-[10px] font-extrabold tracking-[0.1em] text-[#AEB9F5]">MODULE 1</span>
                <strong className="text-sm">Your score</strong>
              </div>
              <svg viewBox="0 0 56 96" className="h-24 w-14 flex-none" fill="none">
                <path d="M0 48 H16 C 30 48, 28 16, 44 16 H56 M16 48 C 30 48, 28 80, 44 80 H56" stroke="#3448C5" strokeWidth="2" strokeDasharray="4 4" />
                <circle cx="16" cy="48" r="4" fill="#3448C5" />
              </svg>
              <div className="flex flex-col gap-7">
                <div className="flex items-center gap-2 rounded-xl bg-brand-500 px-3 py-2.5 text-white shadow-[0_12px_24px_-14px_rgba(31,45,140,0.8)]">
                  <Svg className="h-3.5 w-3.5" stroke="#fff" strokeWidth={2.6}>
                    <path d="M12 19V5M6 11l6-6 6 6" />
                  </Svg>
                  <span className="whitespace-nowrap text-[13px] font-bold">Module 2 · Harder</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border-[1.5px] border-[#B9C2E6] bg-white px-3 py-2.5 text-[#2E3557]">
                  <Svg className="h-3.5 w-3.5" strokeWidth={2.6}>
                    <path d="M12 5v14M6 13l6 6 6-6" />
                  </Svg>
                  <span className="whitespace-nowrap text-[13px] font-bold">Module 2 · Easier</span>
                </div>
              </div>
            </div>
          }
        />
        <FeatureCard
          title="Bluebook-style tools"
          text="Desmos graphing calculator, reference sheet, timer, mark for review, answer eliminator and a question menu."
          picture={
            <div aria-hidden className="grid h-full w-full grid-cols-3 gap-2.5 p-5">
              <ToolTile label="Desmos">
                <Svg>
                  <path d="M3 20h18M4 16c4 0 5-11 8-11s4 11 8 11" />
                </Svg>
              </ToolTile>
              <ToolTile label="Reference">
                <span className="question-text text-lg font-semibold leading-5">x²</span>
              </ToolTile>
              <ToolTile label="Timer" strong>
                <strong className="text-base tabular-nums">31:58</strong>
              </ToolTile>
              <ToolTile label="Review">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#E3E8FF" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 21V4h11l-1.5 4L16 12H5" />
                </svg>
              </ToolTile>
              <ToolTile label="Eliminator">
                <span className="rounded border-[1.5px] border-current px-1 text-xs font-extrabold line-through">ABC</span>
              </ToolTile>
              <ToolTile label="Menu">
                <Svg>
                  <rect x="4" y="4" width="6" height="6" rx="1" />
                  <rect x="14" y="4" width="6" height="6" rx="1" />
                  <rect x="4" y="14" width="6" height="6" rx="1" />
                  <rect x="14" y="14" width="6" height="6" rx="1" />
                </Svg>
              </ToolTile>
            </div>
          }
        />
        <FeatureCard
          title="Scored on the real scale"
          text="Each section is scored 200–800 and the full test 400–1600, with correct, incorrect and skipped counts per module."
          picture={
            <div className="flex flex-col items-center gap-2.5">
              <svg viewBox="0 0 240 130" className="h-[124px] w-[230px]" role="img" aria-label="Score gauge from 400 to 1600">
                <path d="M20 120 A100 100 0 0 1 220 120" fill="none" stroke="#D3DAF6" strokeWidth="16" strokeLinecap="round" />
                <path d="M20 120 A100 100 0 0 1 178.8 39.1" fill="none" stroke="#3448C5" strokeWidth="16" strokeLinecap="round" />
                <circle cx="178.8" cy="39.1" r="11" fill="#fff" stroke="#3448C5" strokeWidth="4" />
                <text x="120" y="104" textAnchor="middle" fontSize="28" fontWeight="800" fill="#0F1535">
                  400–1600
                </text>
              </svg>
              <div className="flex gap-2">
                <span className="rounded-full bg-white px-2.5 py-1.5 text-xs font-bold text-[#2E3557]">R&amp;W 200–800</span>
                <span className="rounded-full bg-white px-2.5 py-1.5 text-xs font-bold text-[#2E3557]">Math 200–800</span>
              </div>
            </div>
          }
        />
      </div>
      <div className="-mt-6 grid gap-6 md:grid-cols-3">
        {MORE_FEATURES.map((feature) => (
          <div key={feature.title} className={`${card} flex gap-4 p-6`}>
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#EEF1FF] text-brand-500">
              <Svg>{feature.icon}</Svg>
            </span>
            <div className="flex flex-col gap-1.5">
              <h3 className="m-0 text-lg font-extrabold tracking-[-0.02em]">{feature.title}</h3>
              <p className="m-0 text-[15px] leading-relaxed text-[#4D5577]">{feature.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionCard({ index, name, icon, dark, stats, text }: { index: number; name: string; icon: ReactNode; dark: boolean; stats: [string, string][]; text: string }) {
  return (
    <div className={`${card} relative min-w-0 flex-[1_1_420px] overflow-hidden`}>
      <div
        className={`flex items-center justify-between gap-3 px-6 py-6 text-white sm:px-[30px] ${dark ? "bg-[linear-gradient(135deg,#1E2A8A_0%,#10163D_100%)]" : "bg-[linear-gradient(135deg,#3448C5_0%,#2A3BB0_100%)]"}`}
      >
        <div className="flex flex-col gap-1">
          <span className="text-xs font-extrabold tracking-[0.12em] text-[#C9D3FF]">SECTION {index}</span>
          <h3 className="m-0 text-2xl font-extrabold tracking-[-0.03em] sm:text-[28px]">{name}</h3>
        </div>
        <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl bg-white/15">
          <Svg className="h-[26px] w-[26px]" stroke="#fff" strokeWidth={1.8}>
            {icon}
          </Svg>
        </span>
      </div>
      <div className="flex flex-col gap-5 px-6 pb-7 pt-6 sm:px-[30px]">
        <div className="grid gap-2.5 min-[480px]:grid-cols-3">
          {stats.map(([value, label]) => (
            <div key={label} className="flex flex-col gap-1 rounded-2xl bg-[#F2F4FD] p-3.5">
              <strong className={`text-[22px] tracking-[-0.03em] sm:text-[26px] ${dark ? "text-[#1E2A8A]" : "text-brand-700"}`}>{value}</strong>
              <span className="text-[13px] font-semibold text-[#4D5577]">{label}</span>
            </div>
          ))}
        </div>
        <p className="m-0 text-base leading-relaxed text-[#4D5577]">{text}</p>
      </div>
    </div>
  );
}

function TwoWays() {
  return (
    <section className={`${container} flex flex-col gap-12 pt-24 sm:pt-[150px]`}>
      <SectionHeading eyebrow="TWO WAYS TO PRACTISE" title="Full tests and focused drills">
        Sit a complete adaptive test exactly like test day, or drill the topics you need most.
      </SectionHeading>

      {/* Adaptive mock test */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="rounded-full bg-brand-500 px-4 py-2 text-[13px] font-extrabold tracking-[0.06em] text-white">ADAPTIVE MOCK TEST</span>
          <span className="text-base font-semibold text-[#2E3557]">Two sections, each in two modules, with a break in between</span>
        </div>
        <div className="relative flex flex-wrap items-center gap-5">
          <div aria-hidden className="absolute left-10 right-10 top-1/2 hidden border-t-2 border-dashed border-[#B9C2E6] lg:block" />
          <SectionCard
            index={1}
            name="Reading and Writing"
            dark={false}
            icon={<path d="M2 5c3-1.5 7-1.5 10 1 3-2.5 7-2.5 10-1v14c-3-1.5-7-1.5-10 1-3-2.5-7-2.5-10-1zM12 6v14" />}
            stats={[
              ["2 × 27", "2 modules × 27 questions"],
              ["32 min", "32 minutes per module"],
              ["200–800", "Scored 200–800"],
            ]}
            text="Short passages with one question each: craft, structure, information, ideas and conventions."
          />
          <div className="relative mx-auto flex flex-none flex-col items-center gap-2">
            <span className="flex h-[92px] w-[92px] flex-col items-center justify-center gap-0.5 rounded-full border-2 border-brand-500 bg-white text-brand-500 shadow-[0_0_0_10px_#F7F8FC,0_20px_40px_-20px_rgba(31,45,140,0.6)]">
              <Svg className="h-6 w-6">
                <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3" />
              </Svg>
              <strong className="text-[15px] leading-none text-brand-700">10 min</strong>
            </span>
            <span className="rounded-full bg-brand-500 px-3.5 py-1.5 text-[13px] font-extrabold text-white">10-minute break</span>
          </div>
          <SectionCard
            index={2}
            name="Math"
            dark
            icon={<path d="M4 7h6M7 4v6M14 7h6M4 17h6M14 15h6M14 19h6" />}
            stats={[
              ["2 × 22", "2 modules × 22 questions"],
              ["35 min", "35 minutes per module"],
              ["200–800", "Scored 200–800"],
            ]}
            text="Algebra, advanced math, data analysis, geometry and trigonometry. Calculator and reference sheet built in."
          />
        </div>
      </div>

      {/* Practice drill */}
      <div className="flex flex-col gap-5 pt-6">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="rounded-full bg-[#10163D] px-4 py-2 text-[13px] font-extrabold tracking-[0.06em] text-white">PRACTICE DRILL</span>
          <span className="text-base font-semibold text-[#2E3557]">Short, targeted sets from any past exam</span>
        </div>
        <div className="relative flex flex-wrap items-center gap-10 overflow-hidden rounded-[32px] bg-[radial-gradient(700px_400px_at_0%_0%,#4A5FE0_0%,rgba(52,72,197,0)_70%),linear-gradient(135deg,#2A3BB0_0%,#1E2A8A_60%,#161F6B_100%)] p-[clamp(24px,5vw,64px)] text-white lg:gap-12">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(90deg,#000,transparent_70%)]"
          />
          <div aria-hidden className="absolute -bottom-[200px] -right-[140px] h-[420px] w-[420px] rounded-full border border-white/[0.12]" />
          <div className="relative flex min-w-0 flex-[1_1_340px] flex-col gap-5">
            <h3 className="m-0 text-[clamp(30px,3.6vw,48px)] font-extrabold leading-[1.05] tracking-[-0.04em]">Practise exactly what you need</h3>
            <p className="m-0 max-w-[440px] text-[17px] leading-relaxed text-[#DCE2FF] sm:text-lg">
              Build a drill in seconds from any of the 26 past exams, in Reading and Writing or Math. Check each answer as you go, then review the whole set.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <span className="rounded-full bg-white px-3.5 py-2 text-sm font-extrabold text-[#1E2A8A]">Reading and Writing</span>
              <span className="rounded-full border-[1.5px] border-white/50 px-3.5 py-2 text-sm font-bold">Math</span>
            </div>
          </div>
          <ul className="relative m-0 grid min-w-0 flex-[2_1_560px] list-none gap-3.5 p-0 sm:grid-cols-2">
            {DRILL_POINTS.map((point) => (
              <li key={point.title} className="flex items-start gap-3.5 rounded-[20px] border border-white/[0.18] bg-white/[0.09] p-5">
                <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl bg-white text-brand-500">
                  <Svg>{point.icon}</Svg>
                </span>
                <div className="flex flex-col gap-1">
                  <strong className="text-[17px]">{point.title}</strong>
                  <span className="text-[15px] leading-normal text-[#DCE2FF]">{point.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className={`${container} flex flex-col gap-14 pt-24 sm:pt-[150px]`}>
      <SectionHeading eyebrow="HOW IT WORKS" title="From sign-up to your first score in minutes" />
      <div className="relative">
        <div aria-hidden className="absolute left-[16%] right-[16%] top-10 hidden border-t-2 border-dashed border-[#B9C2E6] md:block" />
        <ol className="relative m-0 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative flex flex-col items-center gap-[22px] text-center">
              <span
                className={`flex h-20 w-20 items-center justify-center rounded-full text-[30px] font-extrabold text-white shadow-[0_0_0_10px_#F7F8FC,0_0_0_11px_#DDE2F1,0_20px_40px_-16px_rgba(31,45,140,0.7)] ${
                  index === STEPS.length - 1 ? "bg-[#10163D]" : "bg-brand-500"
                }`}
              >
                {index + 1}
              </span>
              <div className={`${card} flex w-full flex-col gap-2 rounded-3xl p-7`}>
                <h3 className="m-0 text-[21px] font-extrabold tracking-[-0.02em]">{step.title}</h3>
                <p className="m-0 text-base leading-relaxed text-[#4D5577]">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ClosingCall() {
  return (
    <section className={`${container} pb-20 pt-24 sm:pb-[120px] sm:pt-[150px]`}>
      <div className="relative flex flex-col items-center gap-[22px] overflow-hidden rounded-[36px] bg-[radial-gradient(800px_400px_at_50%_0%,#4A5FE0_0%,rgba(52,72,197,0)_70%),linear-gradient(180deg,#3448C5_0%,#2A3BB0_100%)] px-5 py-[clamp(56px,8vw,104px)] text-center text-white shadow-[0_50px_90px_-50px_rgba(31,45,140,0.8)] sm:px-8">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,#000_20%,transparent_75%)]"
        />
        <div aria-hidden className="absolute -bottom-40 -left-[120px] h-[360px] w-[360px] rounded-full bg-white/[0.08]" />
        <div aria-hidden className="absolute -bottom-60 -left-[200px] h-[520px] w-[520px] rounded-full border border-white/15" />
        <div aria-hidden className="absolute -right-[90px] -top-[110px] h-[300px] w-[300px] rounded-full bg-white/[0.08]" />
        <div aria-hidden className="absolute -right-[170px] -top-[190px] h-[460px] w-[460px] rounded-full border border-white/15" />
        <Fin className="relative h-14 w-14" />
        <h2 className="relative m-0 max-w-[900px] text-balance text-[clamp(34px,5.4vw,72px)] font-extrabold leading-[1.02] tracking-[-0.05em]">
          Your next practice test is one click away
        </h2>
        <p className="relative m-0 max-w-[560px] text-[17px] leading-relaxed text-[#DCE2FF] sm:text-[19px]">Create a free account and take a full adaptive Digital SAT today.</p>
        <HomeActions className="relative mt-2 w-full justify-center sm:w-auto" />
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <Why />
      <TwoWays />
      <HowItWorks />
      <ClosingCall />
    </>
  );
}
