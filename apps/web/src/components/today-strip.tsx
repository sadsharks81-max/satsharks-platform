"use client";

import Link from "next/link";
import { useEngagement } from "@/lib/engagement";
import { Meter } from "./charts";

// Top of the dashboard: today's goal, the streak, mistakes due and the distance to the target score.
// Every number is the student's own; nothing shows until there is something true to show.
export function TodayStrip() {
  const { data } = useEngagement();
  if (!data) return null;
  const { goal, streak, settings, predicted, mistakesDue } = data;
  const gap = settings.targetScore !== null && predicted !== null ? settings.targetScore - predicted : null;
  const tile = "flex min-h-[92px] flex-col justify-between rounded-2xl border border-slate-900 bg-white p-4 transition hover:bg-slate-50";

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Link href="/goals" className={tile}>
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Today&apos;s goal</span>
        <span className="text-xl font-bold tabular-nums">
          {goal.progress} / {goal.amount} <span className="text-sm font-semibold text-slate-500">{goal.type}</span>
        </span>
        <Meter value={goal.progress / goal.amount} label="Today's goal" />
      </Link>
      <Link href="/goals" className={tile}>
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Streak</span>
        <span className="text-xl font-bold">
          {streak.current} day{streak.current === 1 ? "" : "s"}
        </span>
        <span className="text-xs text-slate-600">{streak.today ? "Today counts" : streak.atRisk ? "Reach today's goal to keep it" : "Reach your goal to start one"}</span>
      </Link>
      <Link href="/mistakes" className={tile}>
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Mistakes to retry</span>
        <span className="text-xl font-bold tabular-nums">{mistakesDue}</span>
        <span className="text-xs text-slate-600">{mistakesDue > 0 ? "Due today in your retry queue" : "Nothing due today"}</span>
      </Link>
      <Link href={gap === null ? "/goals" : "/analytics"} className={tile}>
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Predicted score</span>
        <span className="text-xl font-bold tabular-nums">{predicted ?? "–"}</span>
        <span className="text-xs text-slate-600">
          {gap === null
            ? predicted === null
              ? "After your first full test"
              : "Set a target score"
            : gap > 0
              ? `${gap} points to your ${settings.targetScore} target`
              : `At your ${settings.targetScore} target`}
        </span>
      </Link>
    </div>
  );
}
