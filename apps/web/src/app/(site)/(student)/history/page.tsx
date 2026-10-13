"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  SECTION_LABELS,
  type Difficulty,
  type PracticeCatalog,
  type QuestionHistoryPage,
  type QuestionResultKind,
  type Section,
  type TestHistoryEntry,
} from "@satsharks/types";
import { LineChart } from "@/components/charts";
import { Badge, Button, Card, Notice, PageHeader, Spinner, Toggle } from "@/components/ui";
import { api } from "@/lib/api";
import { formatShortDuration } from "@/lib/format";
import { toPlainText } from "@/lib/rich-text";

const input = "h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const longDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

type Series = "full" | Section;
const SERIES: { id: Series; label: string; min: number; max: number }[] = [
  { id: "full", label: "Full tests", min: 400, max: 1600 },
  { id: "reading_writing", label: "Reading and Writing", min: 200, max: 800 },
  { id: "math", label: "Math", min: 200, max: 800 },
];

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">–</span>;
  if (value === 0) return <span className="text-slate-600">±0</span>;
  return (
    <span className={`font-bold ${value > 0 ? "text-green-700" : "text-red-700"}`}>
      {value > 0 ? "▲ +" : "▼ "}
      {value}
    </span>
  );
}

function Tests() {
  const { data, isLoading, error } = useQuery({ queryKey: ["student", "history", "tests"], queryFn: () => api<{ tests: TestHistoryEntry[] }>("/api/student/history/tests") });
  const tests = useMemo(() => data?.tests ?? [], [data]);
  // The series with data, full tests first.
  const available = SERIES.filter((series) => tests.some((test) => test.score !== null && (series.id === "full" ? test.kind === "full_test" : test.kind === "section" && test.section === series.id)));
  const [chosen, setChosen] = useState<Series | null>(null);
  const series = available.find((entry) => entry.id === chosen) ?? available[0];

  if (isLoading) return <Spinner label="Loading your tests" />;
  if (error) return <Notice tone="error">{error.message}</Notice>;
  if (tests.length === 0)
    return (
      <Notice tone="info">
        No finished tests yet. Take an adaptive mock or a full test from the{" "}
        <Link href="/dashboard" className="font-bold text-brand-500 hover:underline">
          dashboard
        </Link>
        .
      </Notice>
    );

  const points = series
    ? [...tests]
        .reverse()
        .filter((test) => test.score !== null && (series.id === "full" ? test.kind === "full_test" : test.kind === "section" && test.section === series.id))
        .map((test) => ({ label: shortDate(test.completedAt), value: test.score!, detail: test.name }))
    : [];

  return (
    <div className="grid grid-cols-1 gap-4">
      {series && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">Score over time: {series.label}</h2>
            {available.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {available.map((entry) => (
                  <Toggle key={entry.id} active={entry.id === series.id} onClick={() => setChosen(entry.id)} className="py-1.5 text-xs">
                    {entry.label}
                  </Toggle>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3">
            <LineChart points={points} min={series.min} max={series.max} caption={`Score over time, ${series.label}`} valueLabel="Score" />
          </div>
        </Card>
      )}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-900 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Test</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-right">Change</th>
                <th className="px-4 py-3 text-right">Correct</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tests.map((test) => (
                <tr key={`${test.kind}-${test.id}`}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{longDate(test.completedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{test.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge tone="brand">{test.kind === "full_test" ? "Full test" : SECTION_LABELS[test.section!]}</Badge>
                      {test.removed && <Badge>Removed from My tests</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold tabular-nums">{test.score ?? "–"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <Change value={test.change} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {test.correct} / {test.total}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={test.href} className="font-bold text-brand-500 hover:underline">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const RESULT_TONE: Record<QuestionResultKind, "green" | "red" | "neutral"> = { correct: "green", wrong: "red", skipped: "neutral" };

function Questions() {
  const catalog = useQuery({ queryKey: ["practice", "catalog"], queryFn: () => api<PracticeCatalog>("/api/practice/catalog") });
  const [filters, setFilters] = useState({ result: "", section: "", topic: "", difficulty: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ ...filters, page: String(page), pageSize: "25" });
  const history = useQuery({
    queryKey: ["student", "history", "questions", params.toString()],
    queryFn: () => api<QuestionHistoryPage>(`/api/student/history/questions?${params}`),
    placeholderData: keepPreviousData,
  });
  const set = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value, ...(key === "section" ? { topic: "" } : {}) }));
    setPage(1);
  };
  const topics = filters.section ? (catalog.data?.topics[filters.section as Section] ?? []) : [...(catalog.data?.topics.reading_writing ?? []), ...(catalog.data?.topics.math ?? [])];
  const data = history.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="text-xs font-bold">
            Result
            <select value={filters.result} onChange={(event) => set("result", event.target.value)} className={`${input} mt-1 w-full`}>
              <option value="">All</option>
              <option value="correct">Correct</option>
              <option value="wrong">Wrong</option>
              <option value="skipped">Left blank</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            Section
            <select value={filters.section} onChange={(event) => set("section", event.target.value)} className={`${input} mt-1 w-full`}>
              <option value="">Both</option>
              <option value="reading_writing">Reading and Writing</option>
              <option value="math">Math</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            Topic
            <select value={filters.topic} onChange={(event) => set("topic", event.target.value)} className={`${input} mt-1 w-full`}>
              <option value="">All topics</option>
              {[...new Set(topics.map((topic) => topic.topic))].map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            Difficulty
            <select value={filters.difficulty} onChange={(event) => set("difficulty", event.target.value as Difficulty | "")} className={`${input} mt-1 w-full`}>
              <option value="">All</option>
              <option value="easy">Easy</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            From
            <input type="date" value={filters.from} onChange={(event) => set("from", event.target.value)} className={`${input} mt-1 w-full`} />
          </label>
          <label className="text-xs font-bold">
            To
            <input type="date" value={filters.to} onChange={(event) => set("to", event.target.value)} className={`${input} mt-1 w-full`} />
          </label>
        </div>
      </Card>

      {history.isLoading && <Spinner label="Loading questions" />}
      {history.error && <Notice tone="error">{history.error.message}</Notice>}
      {data && data.total === 0 && <Notice tone="info">No questions match. Questions appear here once you check them in a drill or finish a test.</Notice>}
      {data && data.total > 0 && (
        <Card className="p-0">
          <p className="border-b border-slate-900 px-5 py-3 text-sm font-bold">{data.total.toLocaleString()} questions</p>
          <ul className="divide-y divide-slate-200">
            {data.items.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 px-5 py-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm text-slate-800">{toPlainText(item.preview) || "Question"}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <Badge tone={RESULT_TONE[item.result]}>{item.result === "skipped" ? "Blank" : item.result}</Badge>
                    <Badge>{SECTION_LABELS[item.section]}</Badge>
                    {item.skill && <span>{item.skill}</span>}
                    {item.difficulty && <span>· {item.difficulty}</span>}
                    <span>· {formatShortDuration(item.timeSpentSeconds)}</span>
                    <span>· {longDate(item.answeredAt)}</span>
                    <span className="truncate">· {item.attemptName}</span>
                  </div>
                </div>
                <Link href={`/practice/${item.attemptId}/results?q=${item.position}`} className="flex-none text-sm font-bold text-brand-500 hover:underline">
                  Review
                </Link>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm">
              <span>
                Page {data.page} of {pages}
              </span>
              <span className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [tab, setTab] = useState<"tests" | "questions">("tests");
  return (
    <>
      <PageHeader title="History" subtitle="Every test and every question you have answered, kept for good." />
      <div role="tablist" className="mb-4 inline-flex rounded-lg border border-slate-900 bg-white p-1">
        {(
          [
            ["tests", "Tests"],
            ["questions", "Questions"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-9 cursor-pointer rounded-md px-4 text-sm font-bold ${tab === id ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "tests" ? <Tests /> : <Questions />}
    </>
  );
}
