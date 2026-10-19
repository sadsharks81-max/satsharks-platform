"use client";

import Link from "next/link";
import { useEngagement } from "@/lib/engagement";

// Proposal "sell the gap" and "their own countdown": the distance from the predicted score to the
// student's target, and the days to their own test date. Only the student's real numbers; nothing
// shows until there is something true to show.
export function GoalGap() {
  const { data } = useEngagement();
  if (!data) return null;
  const { settings, predicted, test } = data;
  const target = settings.targetScore;
  const gap = target !== null && predicted !== null ? target - predicted : null;
  const days = test.daysLeft;

  let headline: string;
  let detail: string;
  if (gap !== null && gap > 0) {
    headline = `${gap} points to your ${target} target`;
    detail = `Predicted score ${predicted}. Your analytics show which skills close the gap fastest.`;
  } else if (gap !== null) {
    headline = `You are at your ${target} target`;
    detail = `Predicted score ${predicted}. Keep your streak going, or aim higher on Goals & streaks.`;
  } else if (target === null) {
    headline = "Set your target score";
    detail = "Tell us the score you need and we will show how far you are from it.";
  } else {
    headline = `Your target: ${target}`;
    detail = "Finish a full test to see your predicted score and the gap to your target.";
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-slate-900 bg-white px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold tracking-tight">{headline}</p>
        <p className="text-sm text-slate-600">{detail}</p>
      </div>
      {days !== null &&
        (test.fromSettings ? (
          <p className="text-sm font-bold">Your test is {days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}</p>
        ) : (
          // No test date of their own (none chosen at sign-up or on Goals & streaks): the next SAT date.
          <p className="text-sm">
            <span className="font-bold">The next SAT is {days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}</span>{" "}
            <Link href="/goals" className="font-bold text-brand-500 hover:underline">
              Set your test date
            </Link>
          </p>
        ))}
      <Link href={gap !== null && gap > 0 ? "/analytics" : "/goals"} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">
        {gap !== null && gap > 0 ? "Close the gap" : target === null ? "Set my target" : "Goals & streaks"}
      </Link>
    </div>
  );
}

// "Test in 47 days" in the nav on every page: the student's own test date, or "Next SAT in 47 days"
// when they have not chosen one.
export function TestCountdownChip({ className = "" }: { className?: string }) {
  const { data } = useEngagement();
  const days = data?.test.daysLeft;
  if (days === null || days === undefined) return null;
  return (
    <Link
      href="/goals"
      title={data!.test.fromSettings ? "Your SAT date (change it on Goals & streaks)" : "The next SAT date. Set your own on Goals & streaks."}
      className={`whitespace-nowrap rounded-full border border-current px-3 py-1 text-xs font-bold ${className}`}
    >
      {data!.test.fromSettings
        ? days === 0
          ? "Test day!"
          : `Test in ${days} day${days === 1 ? "" : "s"}`
        : days === 0
          ? "SAT today"
          : `Next SAT in ${days} day${days === 1 ? "" : "s"}`}
    </Link>
  );
}
