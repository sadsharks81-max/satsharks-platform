"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { TodayStrip } from "@/components/today-strip";

// The student panel's own dashboard: today's goal, streak, mistakes due and predicted score, then a
// way into each part of the panel. The home page (/dashboard) stays the place to start practising.
const PARTS = [
  { href: "/practice", title: "My tests", text: "Every drill, mock and full test you have started, to resume or review." },
  { href: "/history", title: "History", text: "Your scores over time and every question you have answered." },
  { href: "/mistakes", title: "Mistake bank", text: "Questions you got wrong come back until you get them right." },
  { href: "/analytics", title: "Analytics", text: "Predicted score, the skills costing you points, errors and timing." },
  { href: "/goals", title: "Goals & streaks", text: "Your daily goal, target score, test date and practice streak." },
  { href: "/leaderboard", title: "Leaderboard", text: "Practice points this week and all time, with friends too." },
];

export default function PortalPage() {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your progress at a glance." />
      <div className="grid grid-cols-1 gap-6">
        <TodayStrip />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {PARTS.map((part) => (
            <Link key={part.href} href={part.href} className="rounded-2xl border border-slate-900 bg-white p-5 transition hover:bg-slate-50">
              <h2 className="font-bold">
                {part.title} <span className="text-brand-500">→</span>
              </h2>
              <p className="mt-1 text-sm text-slate-600">{part.text}</p>
            </Link>
          ))}
        </div>
        <p className="text-sm text-slate-600">
          To start a drill, mock or full test, go to{" "}
          <Link href="/dashboard" className="font-bold text-brand-500 hover:underline">
            Home
          </Link>
          .
        </p>
      </div>
    </>
  );
}
