"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RETRY_INTERVAL_DAYS, SECTION_LABELS, SECTIONS, type MistakeBank, type MistakeItem } from "@satsharks/types";
import { UnlockButton } from "@/components/plan-lock";
import { Badge, Button, Card, Notice, PageHeader, Spinner, Toggle } from "@/components/ui";
import { api } from "@/lib/api";
import { useStartRetry } from "@/lib/engagement";
import { toPlainText } from "@/lib/rich-text";

const FILTERS = [
  { id: "open", label: "To fix" },
  { id: "due", label: "Due now" },
  { id: "fixed", label: "Fixed" },
  { id: "", label: "All" },
] as const;

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function when(item: MistakeItem): string {
  if (item.status === "fixed") return `Fixed ${day(item.fixedAt!)}`;
  if (item.status === "due") return "Due now";
  return `Back on ${day(item.dueAt!)}`;
}

const STATUS_STYLE = {
  due: "border-red-600 text-red-700",
  waiting: "border-amber-500 text-amber-700",
  fixed: "border-green-600 text-green-700",
} as const;

export default function MistakesPage() {
  const [status, setStatus] = useState<(typeof FILTERS)[number]["id"]>("open");
  const [section, setSection] = useState("");
  const params = new URLSearchParams({ status, section });
  const bank = useQuery({ queryKey: ["student", "mistakes", params.toString()], queryFn: () => api<MistakeBank>(`/api/student/mistakes?${params}`) });
  const retry = useStartRetry();
  const data = bank.data;

  return (
    <>
      <PageHeader
        title="Mistake bank"
        subtitle={`Every question you got wrong is saved here. It comes back after ${RETRY_INTERVAL_DAYS.join(", ").replace(/, (\d+)$/, " and $1")} days until you answer it correctly.`}
      />

      {bank.isLoading && <Spinner label="Loading your mistakes" />}
      {bank.error && <Notice tone="error">{bank.error.message}</Notice>}
      {data && (
        <div className="grid grid-cols-1 gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <div className="text-2xl font-bold">{data.counts.due}</div>
              <div className="text-sm font-medium text-slate-600">Due for a retry now</div>
            </Card>
            <Card>
              <div className="text-2xl font-bold">{data.counts.open}</div>
              <div className="text-sm font-medium text-slate-600">Still to fix</div>
            </Card>
            <Card>
              <div className="text-2xl font-bold">{data.counts.fixed}</div>
              <div className="text-sm font-medium text-slate-600">Fixed</div>
            </Card>
          </div>

          <Card>
            <h2 className="font-bold">Retry queue</h2>
            <p className="mt-1 text-sm text-slate-600">
              A drill of the mistakes that are due, with instant feedback. Right answers leave the queue; wrong ones come back after the next wait.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SECTIONS.map((entry) => (
                <Button key={entry} disabled={retry.busy || data.counts.dueBySection[entry] === 0} onClick={() => retry.start(entry)}>
                  Retry {SECTION_LABELS[entry]} ({data.counts.dueBySection[entry]})
                </Button>
              ))}
            </div>
            {retry.error && (
              <div className="mt-3">
                <Notice tone="error">{retry.error}</Notice>
              </div>
            )}
          </Card>

          {data.limited && (
            <Card className="flex flex-wrap items-center justify-between gap-3 border-amber-500 bg-amber-50">
              <p className="text-sm text-amber-900">
                The free plan keeps your last {data.limit} mistakes. Paid plans keep every mistake and retry all of them.
              </p>
              <UnlockButton />
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((filter) => (
              <Toggle key={filter.id} active={status === filter.id} onClick={() => setStatus(filter.id)} className="py-1.5 text-xs">
                {filter.label}
              </Toggle>
            ))}
            <select
              value={section}
              onChange={(event) => setSection(event.target.value)}
              aria-label="Section"
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold outline-none focus:border-brand-500"
            >
              <option value="">Both sections</option>
              {SECTIONS.map((entry) => (
                <option key={entry} value={entry}>
                  {SECTION_LABELS[entry]}
                </option>
              ))}
            </select>
          </div>

          {data.items.length === 0 ? (
            <Notice tone="info">{status === "open" ? "Nothing to fix. Wrong answers from drills and tests appear here by themselves." : "Nothing here."}</Notice>
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-slate-200">
                {data.items.map((item) => (
                  <li key={item.id} className="flex flex-col gap-2 px-5 py-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm text-slate-800">{toPlainText(item.preview) || "Question"}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[item.status]}`}>{when(item)}</span>
                        <Badge>{SECTION_LABELS[item.section]}</Badge>
                        {item.skill && <span>{item.skill}</span>}
                        <span>
                          · wrong {item.wrongCount}× · last {day(item.lastWrongAt)}
                        </span>
                        {item.status !== "fixed" && (
                          <span>
                            · wait {item.step} of {RETRY_INTERVAL_DAYS.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link href={`/practice/${item.attemptId}/results?q=${item.position}`} className="flex-none text-sm font-bold text-brand-500 hover:underline">
                      See the answer
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
