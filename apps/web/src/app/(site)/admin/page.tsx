"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatMoney, type AdminStats } from "@satsharks/types";
import { useMe } from "@/lib/auth";
import { Card, Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

function Stat({ label, value, detail, href }: { label: string; value: string | number | undefined; detail?: string; href?: string }) {
  const body = (
    <Card className={href ? "h-full transition hover:bg-slate-50" : "h-full"}>
      <div className="text-2xl font-bold">{value ?? "…"}</div>
      <div className="mt-1 text-sm font-medium text-slate-600">
        {label}
        {href && <span className="ml-1 text-brand-500">→</span>}
      </div>
      {detail && <div className="mt-1 text-xs text-slate-500">{detail}</div>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function AdminDashboardPage() {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => api<AdminStats>("/api/admin/stats"), staleTime: 30_000 });
  const s = stats.data;
  const { data: me } = useMe();
  const money = me?.permissions.includes("payments:read") ?? false;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Users, sign-ups, revenue, practice today, papers and reports. “Today” is the day in Pakistan." />
      {stats.error && (
        <div className="mb-4">
          <Notice tone="error">{stats.error.message}</Notice>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Users"
          value={s?.users.toLocaleString()}
          detail={
            s
              ? `${s.paidUsers} paid · ${s.usersByRegion.local} local · ${s.usersByRegion.international} international${s.usersByRegion.unknown ? ` · ${s.usersByRegion.unknown} no country` : ""}`
              : undefined
          }
          href="/admin/users"
        />
        <Stat label="Paid vs free" value={s ? `${s.paidUsers} / ${Math.max(0, s.users - s.paidUsers)}` : undefined} detail={s && s.users > 0 ? `${Math.round((s.paidUsers / s.users) * 100)}% of accounts are paid` : undefined} href="/admin/users" />
        <Stat label="New sign-ups today" value={s?.signups.today.toLocaleString()} detail={s ? `${s.signups.week.toLocaleString()} in the last 7 days` : undefined} />
        <Stat
          label="Practice started today"
          value={s ? (s.practiceToday.drills + s.practiceToday.mocks + s.practiceToday.fullTests).toLocaleString() : undefined}
          detail={s ? `${s.practiceToday.fullTests} full tests · ${s.practiceToday.mocks} section mocks · ${s.practiceToday.drills} drills` : undefined}
        />
        {money && (
          <>
            <Stat
              label="Revenue this month"
              value={s ? formatMoney(s.revenue.PKR.month, "PKR") : undefined}
              detail={s ? `${formatMoney(s.revenue.USD.month, "USD")} international · all time ${formatMoney(s.revenue.PKR.total, "PKR")} + ${formatMoney(s.revenue.USD.total, "USD")}` : undefined}
              href="/admin/payments"
            />
            <Stat
              label="Transfers to approve"
              value={s?.payments.toReview.toLocaleString()}
              detail={s && s.payments.unseen > 0 ? `${s.payments.unseen} new payment${s.payments.unseen === 1 ? "" : "s"} since you last looked` : "Approve them in Payments"}
              href="/admin/payments"
            />
          </>
        )}
        <Stat label="Papers published" value={s ? `${s.papers.published} of ${s.papers.draft + s.papers.published + s.papers.hidden}` : undefined} href="/admin/papers" />
        <Stat
          label="Questions"
          value={s ? (s.questions.draft + s.questions.published + s.questions.hidden).toLocaleString() : undefined}
          detail={s ? `${s.questionsBySection.math.toLocaleString()} Math · ${s.questionsBySection.reading_writing.toLocaleString()} Reading & Writing` : undefined}
        />
        <Stat label="Drills and mocks started" value={s?.attempts.toLocaleString()} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="font-bold">Problem reports</h2>
            {s && s.reports.pending > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{s.reports.pending} pending</span>}
          </div>
          <p className="mt-1 flex-1 text-sm text-slate-600">
            {s ? (s.reports.pending === 0 ? "No reports are waiting." : `${s.reports.pending} report${s.reports.pending === 1 ? "" : "s"} waiting for review.`) : "…"} Fix the question and
            resolve the report from one screen.
          </p>
          <Link href="/admin/reports" className="mt-3 self-start rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">
            Open reports
          </Link>
        </Card>
        <Card className="flex flex-col">
          <h2 className="font-bold">Question bank</h2>
          <p className="mt-1 flex-1 text-sm text-slate-600">Browse by section, topic, skill and difficulty. Search, edit and delete.</p>
          <Link href="/admin/questions" className="mt-3 self-start rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">
            Open question bank
          </Link>
        </Card>
        <Card className="flex flex-col">
          <h2 className="font-bold">Scoring and adaptive settings</h2>
          <p className="mt-1 flex-1 text-sm text-slate-600">Module 2 routing threshold and the raw-to-scaled conversion tables for 200–800 section scores.</p>
          <Link href="/admin/settings" className="mt-3 self-start rounded-lg border border-slate-900 bg-white px-4 py-2 text-sm font-bold hover:bg-slate-100">
            Open settings
          </Link>
        </Card>
      </div>
    </>
  );
}
