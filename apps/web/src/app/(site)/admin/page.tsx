"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { AdminStats } from "@satsharks/types";
import { Card, Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

function Stat({ label, value, detail }: { label: string; value: string | number | undefined; detail?: string }) {
  return (
    <Card>
      <div className="text-2xl font-bold">{value ?? "…"}</div>
      <div className="mt-1 text-sm font-medium text-slate-600">{label}</div>
      {detail && <div className="mt-1 text-xs text-slate-500">{detail}</div>}
    </Card>
  );
}

export default function AdminDashboardPage() {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => api<AdminStats>("/api/admin/stats"), staleTime: 30_000 });
  const s = stats.data;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="An overview of users, papers, questions and reports." />
      {stats.error && (
        <div className="mb-4">
          <Notice tone="error">{stats.error.message}</Notice>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Users"
          value={s?.users.toLocaleString()}
          detail={s ? `${s.usersByRegion.local} local · ${s.usersByRegion.international} international${s.usersByRegion.unknown ? ` · ${s.usersByRegion.unknown} no country` : ""}` : undefined}
        />
        <Stat label="Papers published" value={s ? `${s.papers.published} of ${s.papers.draft + s.papers.published + s.papers.hidden}` : undefined} />
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
