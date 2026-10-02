"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AttemptSummary, CatalogExam, PracticeCatalog } from "@satsharks/types";
import { AttemptCard } from "@/components/attempt-card";
import { CreateDrill } from "@/components/create-drill";
import { RequireUser } from "@/components/require-user";
import { Badge, Button, Card, Notice, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

const SEASONS = ["Spring", "Summer", "Fall", "Winter"] as const;

function yearOf(exam: CatalogExam): number | null {
  const fromDate = exam.examDate ? parseInt(exam.examDate.slice(0, 4), 10) : NaN;
  if (!Number.isNaN(fromDate)) return fromDate;
  const match = /\b(20\d\d)\b/.exec(exam.name);
  return match ? parseInt(match[1]!, 10) : null;
}

function seasonOf(exam: CatalogExam): (typeof SEASONS)[number] | null {
  const month = exam.examDate ? parseInt(exam.examDate.slice(5, 7), 10) : NaN;
  if (Number.isNaN(month)) return null;
  if (month >= 3 && month <= 5) return "Spring";
  if (month >= 6 && month <= 8) return "Summer";
  if (month >= 9 && month <= 11) return "Fall";
  return "Winter";
}

function FilterGroup<T extends string | number>({ options, value, onChange }: { options: readonly T[]; value: T | "all"; onChange: (value: T | "all") => void }) {
  const item = (active: boolean) =>
    `cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-bold uppercase ${active ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-100"}`;
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-slate-900 bg-white p-1">
      <button type="button" className={item(value === "all")} onClick={() => onChange("all")}>
        All
      </button>
      {options.map((option) => (
        <button key={option} type="button" className={item(value === option)} onClick={() => onChange(option)}>
          {option}
        </button>
      ))}
    </div>
  );
}

function Home() {
  const catalog = useQuery({ queryKey: ["practice", "catalog"], queryFn: () => api<PracticeCatalog>("/api/practice/catalog") });
  const attempts = useQuery({ queryKey: ["practice", "attempts"], queryFn: () => api<{ attempts: AttemptSummary[] }>("/api/practice/attempts") });
  const [year, setYear] = useState<number | "all">("all");
  const [season, setSeason] = useState<(typeof SEASONS)[number] | "all">("all");
  // undefined = closed, null = open without a preselected exam.
  const [drillExam, setDrillExam] = useState<string | null | undefined>(undefined);

  const exams = catalog.data?.exams ?? [];
  const years = useMemo(() => [...new Set(exams.map(yearOf).filter((value): value is number => value !== null))].sort((a, b) => b - a), [exams]);
  const visible = exams.filter((exam) => (year === "all" || yearOf(exam) === year) && (season === "all" || seasonOf(exam) === season));
  const active = attempts.data?.attempts.filter((attempt) => attempt.status === "active") ?? [];

  if (catalog.isLoading) return <Spinner label="Loading exams" />;
  if (catalog.error) return <Notice tone="error">{catalog.error.message}</Notice>;

  return (
    <div className="space-y-8">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Practice Drill</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">Choose a section, topics, difficulty and length, then practise with instant answer checks.</p>
        </div>
        <Button disabled={exams.length === 0} onClick={() => setDrillExam(null)}>
          Create Practice Drill
        </Button>
      </Card>

      {active.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold">Active Drills ({active.length})</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((attempt) => (
              <AttemptCard key={attempt.id} attempt={attempt} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Exams</h2>
          <div className="flex flex-wrap gap-3">
            <FilterGroup options={years} value={year} onChange={setYear} />
            <FilterGroup options={SEASONS} value={season} onChange={setSeason} />
          </div>
        </div>
        {exams.length === 0 && <Notice tone="info">No exams have been published yet.</Notice>}
        {exams.length > 0 && visible.length === 0 && <Notice tone="info">No exams match these filters.</Notice>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((exam) => {
            const rw = exam.sections.reading_writing?.questionCount ?? 0;
            const math = exam.sections.math?.questionCount ?? 0;
            return (
              <Card key={exam.examId} className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="brand">Total: {rw + math}</Badge>
                  <Badge>RW: {rw}</Badge>
                  <Badge>Math: {math}</Badge>
                </div>
                <h3 className="text-lg font-bold leading-snug">{exam.name}</h3>
                <Button className="mt-auto w-full" onClick={() => setDrillExam(exam.examId)}>
                  Start Exam
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      {drillExam !== undefined && catalog.data && <CreateDrill catalog={catalog.data} initialExamId={drillExam ?? undefined} onClose={() => setDrillExam(undefined)} />}
    </div>
  );
}

export default function DashboardPage() {
  return <RequireUser>{() => <Home />}</RequireUser>;
}
