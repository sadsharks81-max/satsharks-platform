"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { Analytics } from "@satsharks/types";
import { api } from "@/lib/api";

// Proposal "the results-page moment": under a free account's score, a locked panel with the real
// numbers ("Your predicted score is 1180. A paid plan shows the 6 skills costing you 210 points").
// The skills themselves are not sent to the browser; the blurred rows are placeholders.
export function LockedInsights() {
  const analytics = useQuery({ queryKey: ["student", "analytics"], queryFn: () => api<Analytics>("/api/student/analytics"), staleTime: 30_000 });
  const data = analytics.data;
  if (!data || data.full || !data.locked || data.locked.skills === 0) return null;
  const { skills, points } = data.locked;
  const predicted = data.prediction.total;

  return (
    <section className="relative mt-4 overflow-hidden rounded-2xl border border-brand-500 bg-white">
      <div aria-hidden className="pointer-events-none select-none space-y-3 p-5 blur-[5px]">
        {[78, 64, 52, 40].map((width) => (
          <div key={width} className="flex items-center gap-3">
            <span className="h-4 w-40 rounded bg-slate-300" />
            <span className="h-3 flex-1 rounded-full bg-slate-100">
              <span className="block h-3 rounded-full bg-red-400" style={{ width: `${width}%` }} />
            </span>
            <span className="h-4 w-14 rounded bg-slate-300" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 px-5 text-center">
        <p className="max-w-xl text-lg font-bold tracking-tight">
          {predicted !== null ? `Your predicted score is ${predicted}. ` : ""}A paid plan shows the {skills} skill{skills === 1 ? "" : "s"} costing you about {points} points
          {predicted !== null ? "" : " on the SAT"}.
        </p>
        <p className="max-w-xl text-sm text-slate-600">Plus your score range and trend, your error patterns and where you lose time, each with a drill to fix it.</p>
        <Link href="/pricing" className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
          See what is costing me points
        </Link>
      </div>
    </section>
  );
}
