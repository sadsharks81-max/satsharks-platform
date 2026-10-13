"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { POINTS, type EngagementSettings, type EngagementSummary, type GoalType } from "@satsharks/types";
import { ColumnChart, Meter } from "@/components/charts";
import { ShareCard } from "@/components/share-card";
import { Button, Card, Notice, PageHeader, Spinner, Toggle } from "@/components/ui";
import { api } from "@/lib/api";
import { ENGAGEMENT_QUERY_KEY, useEngagement } from "@/lib/engagement";
import { formatDay, upcomingSatDates, useSatDates } from "@/lib/sat-dates";

const input = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const unit = (type: GoalType, amount: number) => (type === "questions" ? `question${amount === 1 ? "" : "s"}` : `minute${amount === 1 ? "" : "s"}`);
const shortDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", day: "numeric" });

function Flame({ on }: { on: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`h-9 w-9 ${on ? "text-orange-500" : "text-slate-300"}`} fill="currentColor">
      <path d="M12 2c1.2 3.6 6 6 6 12a6 6 0 0 1-12 0c0-2.4 1.2-4.2 2.4-5.4 0 2.4 1.2 3.6 2.4 3.6 0-3.6-1.2-6 1.2-10.2z" />
    </svg>
  );
}

function Today({ data }: { data: EngagementSummary }) {
  const { goal, streak, points, test } = data;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <h2 className="font-bold">Today&apos;s goal</h2>
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {goal.progress} <span className="text-lg text-slate-500">/ {goal.amount}</span>
        </p>
        <p className="text-sm text-slate-600">{unit(goal.type, goal.amount)}</p>
        <div className="mt-3">
          <Meter value={goal.progress / goal.amount} label="Today's goal" />
        </div>
        <p className="mt-2 text-xs text-slate-500">{goal.progress >= goal.amount ? "Goal reached today. Well done." : goal.met ? "Today already counts for your streak (you reached the goal before it changed)." : goal.reason}</p>
        {test.daysLeft !== null && (
          <p className="mt-2 text-xs font-semibold text-slate-700">
            Your test is in {test.daysLeft} day{test.daysLeft === 1 ? "" : "s"} ({formatDay(test.date!)}).
          </p>
        )}
      </Card>
      <Card>
        <h2 className="font-bold">Streak</h2>
        <div className="mt-2 flex items-center gap-3">
          <Flame on={streak.current > 0} />
          <div>
            <p className="text-3xl font-bold tabular-nums">{streak.current}</p>
            <p className="text-sm text-slate-600">day{streak.current === 1 ? "" : "s"} in a row · best {streak.longest}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-600">
          {streak.today
            ? "Today counts. Come back tomorrow."
            : streak.atRisk
              ? "Reach today's goal to keep your streak."
              : "Reach your daily goal to start a streak."}{" "}
          Streak freezes left this month: <b>{streak.freezesLeft}</b> of {streak.freezesPerMonth} (used by themselves on a missed day).
        </p>
        <ul className="mt-3 flex gap-2">
          {streak.badges.map((badge) => (
            <li
              key={badge.days}
              title={badge.earnedAt ? `Earned ${new Date(badge.earnedAt).toLocaleDateString()}` : `Reach a ${badge.days}-day streak`}
              className={`flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 text-center ${badge.earnedAt ? "border-orange-500 bg-orange-50 text-orange-700" : "border-dashed border-slate-300 text-slate-400"}`}
            >
              <span className="text-base font-bold leading-none">{badge.days}</span>
              <span className="text-[10px] font-semibold">days</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="font-bold">Practice points</h2>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          {(
            [
              ["Today", points.today],
              ["This week", points.week],
              ["All time", points.total],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 py-3">
              <dd className="text-xl font-bold tabular-nums">{value.toLocaleString()}</dd>
              <dt className="text-xs text-slate-500">{label}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          {POINTS.correct} for a right answer (+{POINTS.hardBonus} if hard), {POINTS.wrongWithEffort} for a real try. Answers given too fast to read earn nothing; at most{" "}
          {points.dailyCap} a day.
        </p>
      </Card>
    </div>
  );
}

function Settings({ data }: { data: EngagementSummary }) {
  const queryClient = useQueryClient();
  const dates = useSatDates();
  const [form, setForm] = useState<EngagementSettings>(data.settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  useEffect(() => setForm(data.settings), [data.settings]);
  const set = <K extends keyof EngagementSettings>(key: K, value: EngagementSettings[K]) => setForm((current) => ({ ...current, [key]: value }));
  const upcoming = dates.data ? upcomingSatDates(dates.data.dates, new Date()) : [];
  // "Another date…": a date that is not in the SAT dates list.
  const [ownDate, setOwnDate] = useState(false);
  useEffect(() => {
    if (dates.data && data.settings.testDate) setOwnDate(!upcomingSatDates(dates.data.dates, new Date()).some((entry) => entry.date === data.settings.testDate));
  }, [dates.data, data.settings.testDate]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const { timeZone: _zone, ...body } = form;
      await api("/api/student/engagement", { method: "PATCH", body });
      await queryClient.invalidateQueries({ queryKey: ENGAGEMENT_QUERY_KEY });
      setMessage({ tone: "info", text: "Saved." });
    } catch (caught) {
      setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="font-bold">Your target and goal</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-bold">
          Target score
          <input
            type="number"
            min={400}
            max={1600}
            step={10}
            value={form.targetScore ?? ""}
            placeholder="e.g. 1450"
            onChange={(event) => set("targetScore", event.target.value ? Math.round(Number(event.target.value) / 10) * 10 : null)}
            className={`${input} mt-1`}
          />
        </label>
        <label className="block text-sm font-bold">
          Your SAT date
          <select
            value={ownDate ? "own" : (form.testDate ?? "")}
            onChange={(event) => {
              setOwnDate(event.target.value === "own");
              if (event.target.value !== "own") set("testDate", event.target.value || null);
            }}
            className={`${input} mt-1`}
          >
            <option value="">The next SAT date</option>
            {upcoming.map((entry) => (
              <option key={entry.date} value={entry.date}>
                {formatDay(entry.date, "long")}
              </option>
            ))}
            <option value="own">Another date…</option>
          </select>
          {ownDate && <input type="date" value={form.testDate ?? ""} onChange={(event) => set("testDate", event.target.value || null)} className={`${input} mt-2`} />}
        </label>
        <div className="text-sm font-bold">
          Daily goal in
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["questions", "minutes"] as const).map((type) => (
              <Toggle key={type} active={form.goalType === type} onClick={() => set("goalType", type)} className="text-center capitalize">
                {type}
              </Toggle>
            ))}
          </div>
        </div>
        <label className="block text-sm font-bold">
          Daily goal
          <div className="mt-1 flex gap-2">
            <select value={form.goalAmount === null ? "auto" : "own"} onChange={(event) => set("goalAmount", event.target.value === "auto" ? null : data.goal.suggested)} className={input}>
              <option value="auto">Suggested ({data.goal.suggested})</option>
              <option value="own">My own</option>
            </select>
            {form.goalAmount !== null && (
              <input
                type="number"
                min={5}
                max={300}
                aria-label="Daily goal amount"
                value={form.goalAmount}
                onChange={(event) => set("goalAmount", Math.min(300, Math.max(5, parseInt(event.target.value, 10) || 5)))}
                className={`${input} w-28`}
              />
            )}
          </div>
          <span className="mt-1 block text-xs font-normal text-slate-500">The suggestion follows your target score, predicted score and test date.</span>
        </label>
      </div>

      <h3 className="mt-6 text-sm font-bold">Emails and leaderboard</h3>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        {(
          [
            ["streakReminders", "Remind me when my streak is at risk"],
            ["weeklyEmail", "Weekly progress email"],
            ["showOnLeaderboard", "Show me on leaderboards"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold">
            {label}
            <input type="checkbox" checked={form[key]} onChange={(event) => set(key, event.target.checked)} className="h-4 w-4 flex-none accent-brand-500" />
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">Days and streaks follow your time zone: {data.settings.timeZone}.</p>
      {message && (
        <div className="mt-3">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
      <Button className="mt-4" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </Card>
  );
}

export default function GoalsPage() {
  const engagement = useEngagement();
  const data = engagement.data;
  return (
    <>
      <PageHeader title="Goals & streaks" subtitle="A daily goal, a streak to keep, and points for the leaderboard." />
      {engagement.isLoading && <Spinner label="Loading your goals" />}
      {engagement.error && <Notice tone="error">{engagement.error.message}</Notice>}
      {data && (
        <div className="grid grid-cols-1 gap-4">
          <Today data={data} />
          <Card>
            <h2 className="font-bold">Last 14 days</h2>
            <p className="mt-1 text-xs text-slate-500">
              {data.goal.type === "questions" ? "Questions answered" : "Minutes practised"} each day; lighter days missed the goal.
            </p>
            <div className="mt-3">
              <ColumnChart
                columns={data.days.map((day) => ({
                  label: shortDay(day.day),
                  value: data.goal.type === "questions" ? day.questions : day.minutes,
                  strong: day.met,
                  detail: `${day.points} points${day.met ? " · goal reached" : ""}`,
                }))}
                reference={{ value: data.goal.amount, label: `Goal ${data.goal.amount}` }}
                caption="Practice in the last 14 days"
                valueLabel={data.goal.type === "questions" ? "Questions" : "Minutes"}
              />
            </div>
          </Card>
          <Settings data={data} />
          <ShareCard />
        </div>
      )}
    </>
  );
}
