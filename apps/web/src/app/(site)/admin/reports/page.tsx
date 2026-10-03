"use client";

import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { REPORT_REASON_LABELS, SECTION_LABELS, type AdminReport, type ReportStatus } from "@satsharks/types";
import { STATUS_BADGE } from "@/components/report-ui";
import { RequireUser } from "@/components/require-user";
import { Badge, Button, Card, Notice, PageHeader, Toggle } from "@/components/ui";
import { api } from "@/lib/api";
import { toPlainText } from "@/lib/rich-text";

type ReportList = { reports: AdminReport[]; total: number; page: number; pageSize: number; counts: Record<ReportStatus, number> };

const PAGE_SIZE = 25;

const formatDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Reports() {
  const [status, setStatus] = useState<ReportStatus | "">("pending");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ status, page: String(page), pageSize: String(PAGE_SIZE) });
  const list = useQuery({
    queryKey: ["admin", "reports", params.toString()],
    queryFn: () => api<ReportList>(`/api/admin/reports?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
  const counts = list.data?.counts;
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));
  const choose = (next: ReportStatus | "") => {
    setStatus(next);
    setPage(1);
  };

  return (
    <>
      <PageHeader title="Problem reports" subtitle="Questions students have flagged. Open a report to fix the question and resolve it." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Toggle active={status === "pending"} onClick={() => choose("pending")}>
          Pending{counts ? ` (${counts.pending})` : ""}
        </Toggle>
        <Toggle active={status === "resolved"} onClick={() => choose("resolved")}>
          Resolved{counts ? ` (${counts.resolved})` : ""}
        </Toggle>
        <Toggle active={status === ""} onClick={() => choose("")}>
          All{counts ? ` (${counts.pending + counts.resolved})` : ""}
        </Toggle>
      </div>

      {list.error && <Notice tone="error">{list.error.message}</Notice>}
      {list.data && list.data.reports.length === 0 && (
        <Notice tone="info">{status === "pending" ? "No reports are waiting. Nice." : "No reports here yet."}</Notice>
      )}

      <div className={`space-y-3 ${list.isFetching ? "opacity-60" : ""}`}>
        {list.data?.reports.map((report) => (
          <Link key={report.id} href={`/admin/reports/${report.id}`} className="block rounded-2xl border border-slate-900 bg-white p-4 transition hover:bg-slate-50 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_BADGE[report.status].tone}>{STATUS_BADGE[report.status].label}</Badge>
              <span className="text-sm font-bold">{REPORT_REASON_LABELS[report.reason]}</span>
              <span className="ml-auto text-xs text-slate-500">{formatDate(report.createdAt)}</span>
            </div>
            {report.details && <p className="mt-2 line-clamp-2 text-sm text-slate-700">&ldquo;{report.details}&rdquo;</p>}
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              {report.question ? (
                <>
                  <p className="line-clamp-2 text-slate-800">{toPlainText(report.question.prompt)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    #{report.question.sourceQuestionId} · {SECTION_LABELS[report.question.section]} · {report.question.paperTitle?.split(" — ")[0] ?? "No paper"}
                  </p>
                </>
              ) : (
                <p className="text-slate-500">This question has been deleted.</p>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Reported by {report.reporter ? `${report.reporter.name} (${report.reporter.email})` : "a deleted account"}
              {report.context.attemptName && ` · in “${report.context.attemptName}”`}
            </p>
          </Link>
        ))}
      </div>

      {list.data && list.data.total > PAGE_SIZE && (
        <Card className="mt-4 flex items-center justify-between gap-3 py-3 text-sm">
          <span>
            Page <b>{page}</b> of <b>{pages}</b>
          </span>
          <span className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </span>
        </Card>
      )}
    </>
  );
}

export default function AdminReportsPage() {
  return <RequireUser permission="reports:read">{() => <Reports />}</RequireUser>;
}
