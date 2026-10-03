"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AttemptSummary, CatalogExam, FullTestSummary, PracticeCatalog } from "@satsharks/types";
import { AttemptCard, FullTestCard } from "@/components/attempt-card";
import { CreateDrill } from "@/components/create-drill";
import { CreateMock } from "@/components/create-mock";
import { RequireUser } from "@/components/require-user";
import { Button, Card, Notice, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

const SEASONS = ["Spring", "Summer", "Fall", "Winter"] as const;
const heading = "text-[20px] font-bold tracking-tight text-black sm:text-[22px]";
const pill = "whitespace-nowrap rounded-full border bg-white px-2.5 py-0.5 text-[11px] font-bold";

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
  const fullTests = useQuery({ queryKey: ["practice", "full-tests"], queryFn: () => api<{ fullTests: FullTestSummary[] }>("/api/practice/full-tests") });
  const [year, setYear] = useState<number | "all">("all");
  const [season, setSeason] = useState<(typeof SEASONS)[number] | "all">("all");
  // undefined = closed, null = open without a preselected exam.
  const [drillExam, setDrillExam] = useState<string | null | undefined>(undefined);
  const [mockOpen, setMockOpen] = useState(false);

  const exams = catalog.data?.exams ?? [];
  const years = useMemo(() => [...new Set(exams.map(yearOf).filter((value): value is number => value !== null))].sort((a, b) => b - a), [exams]);
  const visible = exams.filter((exam) => (year === "all" || yearOf(exam) === year) && (season === "all" || seasonOf(exam) === season));
  // A full test in progress is shown as one card (its sections are not listed separately).
  const activeFullTests = fullTests.data?.fullTests.filter((fullTest) => fullTest.stage !== "done") ?? [];
  const active = attempts.data?.attempts.filter((attempt) => attempt.status === "active" && !attempt.fullTestId) ?? [];
  const activeCount = active.length + activeFullTests.length;

  if (catalog.isLoading) return <Spinner label="Loading exams" />;
  if (catalog.error) return <Notice tone="error">{catalog.error.message}</Notice>;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className={heading}>Adaptive Mock Exam</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              A full test (both sections, scored out of 1600) or one section in two modules. Do well in Module 1 and Module 2 gets harder, just like the real Digital SAT.
            </p>
          </div>
          <Button disabled={exams.length === 0} onClick={() => setMockOpen(true)}>
            Start Adaptive Mock
          </Button>
        </Card>
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className={heading}>Practice Drill</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">Pick a section, topics, difficulty and length, then practise with instant answer checks.</p>
          </div>
          <Button disabled={exams.length === 0} onClick={() => setDrillExam(null)}>
            Create Practice Drill
          </Button>
        </Card>
      </div>

      {activeCount > 0 && (
        <section>
          <h2 className={heading}>Active Drills &amp; Mocks ({activeCount})</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeFullTests.map((fullTest) => (
              <FullTestCard key={fullTest.id} fullTest={fullTest} />
            ))}
            {active.map((attempt) => (
              <AttemptCard key={attempt.id} attempt={attempt} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3.5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h2 className={heading}>Exams</h2>
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
              <div key={exam.examId} className="flex flex-col justify-between gap-4 rounded-[14px] border border-black bg-white p-4 text-black sm:p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`${pill} border-brand-500 text-brand-500`}>Total: {rw + math}</span>
                    <span className="flex items-center gap-1.5">
                      <span className={`${pill} border-black`}>RW: {rw}</span>
                      <span className={`${pill} border-black`}>Math: {math}</span>
                    </span>
                  </div>
                  <h3 className="flex min-h-[44px] items-center text-[18px] font-bold leading-snug tracking-tight">{exam.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDrillExam(exam.examId)}
                  className="flex h-[42px] w-full cursor-pointer items-center justify-center rounded-[10px] bg-brand-500 text-[14px] font-bold text-white hover:opacity-90"
                >
                  Start Exam
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {drillExam !== undefined && catalog.data && <CreateDrill catalog={catalog.data} initialExamId={drillExam ?? undefined} onClose={() => setDrillExam(undefined)} />}
      {mockOpen && catalog.data && <CreateMock catalog={catalog.data} onClose={() => setMockOpen(false)} />}
    </div>
  );
}

export default function DashboardPage() {
  return <RequireUser studentOnly>{() => <Home />}</RequireUser>;
}
