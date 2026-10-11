import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HomeActions } from "@/components/home-actions";
import { SatDatesList } from "@/components/sat-dates-list";

export const metadata: Metadata = {
  title: "SAT dates and registration",
  description: "Upcoming Digital SAT test dates, registration and late registration deadlines, and how to register, including in Pakistan.",
};

const OFFICIAL_DATES = "https://satsuite.collegeboard.org/sat/dates-deadlines";
const OFFICIAL_REGISTER = "https://satsuite.collegeboard.org/sat/registration";
const OFFICIAL_FEES = "https://satsuite.collegeboard.org/sat/registration/fees-refunds/test-fees";
const OFFICIAL_ID = "https://satsuite.collegeboard.org/sat/what-to-bring-do/id-requirements";

// Registration as College Board describes it (fees "through June 2027", ID rules for Pakistan),
// checked 2026-10-11. Dates come from Admin → SAT dates; the guide below is fixed text.
const STEPS: { title: string; text: ReactNode }[] = [
  {
    title: "Create a College Board account",
    text: (
      <>
        Sign up for a free account on the{" "}
        <a href={OFFICIAL_REGISTER} target="_blank" rel="noreferrer" className="font-bold text-brand-500 hover:underline">
          College Board website
        </a>
        . Use your name exactly as it appears on your ID.
      </>
    ),
  },
  {
    title: "Pick a date and a test centre",
    text: "Choose a test date from the list above and a test centre near you. Popular centres fill up quickly, so register early.",
  },
  {
    title: "Upload a photo and pay",
    text: (
      <>
        Upload a clear photo of yourself and pay the fee: $68 to register, plus an international fee for students testing outside the U.S. (shown at checkout). Late registration
        costs $38 more.{" "}
        <a href={OFFICIAL_FEES} target="_blank" rel="noreferrer" className="font-bold text-brand-500 hover:underline">
          All fees
        </a>
      </>
    ),
  },
  {
    title: "Set up Bluebook",
    text: "Install the Bluebook app on the laptop or tablet you will test with and complete exam setup in the days before the test. This gives you your admission ticket.",
  },
  {
    title: "Bring the right things on test day",
    text: (
      <>
        Your charged device, your admission ticket and an original photo ID (in Pakistan, your passport or national ID card; a passport if you test in another country).
        Photocopies and digital IDs are not accepted.{" "}
        <a href={OFFICIAL_ID} target="_blank" rel="noreferrer" className="font-bold text-brand-500 hover:underline">
          ID rules
        </a>
      </>
    ),
  },
];

export default function SatDatesPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 py-6 sm:py-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-[40px] sm:leading-tight">SAT dates and registration</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          Upcoming Digital SAT test dates and deadlines. The same dates apply in Pakistan and around the world.
        </p>
      </header>

      <section aria-labelledby="dates-heading" className="flex flex-col gap-3">
        <h2 id="dates-heading" className="text-xl font-bold tracking-tight">
          Upcoming test dates
        </h2>
        <SatDatesList />
        <p className="text-xs text-slate-500">
          Deadlines end at 11:59 p.m. U.S. Eastern Time, which is the next morning in Pakistan. Dates come from College Board and can change; always check the{" "}
          <a href={OFFICIAL_DATES} target="_blank" rel="noreferrer" className="font-bold text-brand-500 hover:underline">
            official dates
          </a>{" "}
          before you register.
        </p>
      </section>

      <section aria-labelledby="guide-heading" className="flex flex-col gap-4">
        <h2 id="guide-heading" className="text-xl font-bold tracking-tight">
          How to register
        </h2>
        <ol className="grid gap-3 md:grid-cols-2">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4 rounded-2xl border border-slate-900 bg-white p-5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">{index + 1}</span>
              <div>
                <h3 className="font-bold text-black">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col items-center gap-3 rounded-2xl bg-brand-500 px-5 py-10 text-center text-white">
        <h2 className="text-xl font-bold sm:text-2xl">Get ready before your test day</h2>
        <p className="max-w-xl text-sm text-white/85">Practise with real past papers in a test screen that works like Bluebook.</p>
        <HomeActions className="mt-2 w-full justify-center sm:w-auto" />
      </section>

      <p className="text-center text-xs text-slate-500">SAT is a trademark of the College Board, which is not linked to this website and does not endorse it.</p>
    </div>
  );
}
