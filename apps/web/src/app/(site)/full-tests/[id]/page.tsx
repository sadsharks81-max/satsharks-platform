"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FULL_TEST_BREAK_MINUTES, MOCK_MODULE_LABELS, SECTION_LABELS, type AttemptSummary, type FullTestSummary } from "@satsharks/types";
import { RequireUser } from "@/components/require-user";
import { Badge, Button, Card, Notice, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { formatClock, multiplierLabel } from "@/lib/format";

const fetchFullTest = (id: string) => api<{ fullTest: FullTestSummary }>(`/api/practice/full-tests/${id}`).then((data) => data.fullTest);

function SectionResult({ attempt, label }: { attempt: AttemptSummary | null; label: string }) {
  if (!attempt) {
    return (
      <Card>
        <h3 className="font-bold">{label}</h3>
        <p className="mt-2 text-sm text-slate-500">Not taken.</p>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold">{label}</h3>
        <span className="text-3xl font-black text-brand-600">{attempt.sectionScore ?? <span className="text-lg font-bold text-slate-400">Pending</span>}</span>
      </div>
      <ul className="divide-y divide-slate-200 text-sm">
        {attempt.modules.map((result) => (
          <li key={result.module} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
            <span className="font-bold">{result.module === "m1" ? "Module 1" : result.route ? MOCK_MODULE_LABELS[result.route] : "Module 2"}</span>
            <span className="text-slate-600">
              <span className="text-green-700">{result.correct} correct</span> · <span className="text-red-700">{result.incorrect} incorrect</span> ·{" "}
              <span className="text-amber-700">{result.skipped} skipped</span>
              {result.timeUsedSeconds !== null && <> · {formatClock(result.timeUsedSeconds)}</>}
            </span>
          </li>
        ))}
      </ul>
      <Link href={`/practice/${attempt.id}/results`} className="mt-auto self-start text-sm font-bold text-brand-500 hover:underline">
        Review every {SECTION_LABELS[attempt.section]} question →
      </Link>
    </Card>
  );
}

// The break between the sections. Like Bluebook, it can be ended early; when the time is up the
// Math section starts by itself (if this page is open).
function BreakScreen({ fullTest, onContinue, busy }: { fullTest: FullTestSummary; onContinue: () => void; busy: boolean }) {
  const endsAt = fullTest.breakEndsAt ? new Date(fullTest.breakEndsAt).getTime() : Date.now();
  const [left, setLeft] = useState(() => Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
  // Starts Math automatically only when the break runs out while this page is open. Coming back
  // after it ended, the student presses Resume when ready.
  const started = useRef(left === 0);
  useEffect(() => {
    const timer = setInterval(() => setLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [endsAt]);
  useEffect(() => {
    if (left === 0 && !started.current) {
      started.current = true;
      onContinue();
    }
  }, [left, onContinue]);

  return (
    <div className="mx-auto max-w-xl py-6 text-center sm:py-12">
      <Badge tone="brand">Reading and Writing complete</Badge>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Take a break</h1>
      <p className="mt-2 text-slate-600">
        {left > 0
          ? `You have a ${FULL_TEST_BREAK_MINUTES}-minute break before the Math section. Math starts on its own when the break ends.`
          : "Your break is over. Start the Math section when you are ready."}
      </p>
      <div className="mx-auto mt-8 w-fit rounded-2xl border border-slate-900 bg-white px-10 py-6">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Remaining break time</div>
        <div className="mt-1 text-5xl font-black tabular-nums" aria-live="off">
          {formatClock(left)}
        </div>
      </div>
      <Button className="mt-8 w-full sm:w-auto" disabled={busy} onClick={onContinue}>
        {busy ? "Starting Math…" : "Resume testing"}
      </Button>
      <ul className="mx-auto mt-8 max-w-md space-y-1 text-left text-sm text-slate-600">
        <li>• Do not close this tab if you want Math to start automatically.</li>
        <li>• If you leave, come back from Home: Math starts when you press Resume testing.</li>
      </ul>
    </div>
  );
}

function FullTestView({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: fullTest, isLoading, error } = useQuery({ queryKey: ["practice", "full-test", id], queryFn: () => fetchFullTest(id), staleTime: 0 });
  const [busy, setBusy] = useState(false);
  const [continueError, setContinueError] = useState<string | null>(null);

  const continueToMath = useCallback(async () => {
    setBusy(true);
    setContinueError(null);
    try {
      const { fullTest: next } = await api<{ fullTest: FullTestSummary }>(`/api/practice/full-tests/${id}/continue`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["practice"] });
      if (next.math) router.push(`/practice/${next.math.id}`);
    } catch (caught) {
      setContinueError(caught instanceof Error ? caught.message : "Could not start the Math section");
      setBusy(false);
    }
  }, [id, queryClient, router]);

  if (isLoading) return <Spinner label="Loading full test" />;
  if (error) return <Notice tone="error">{error.message}</Notice>;
  if (!fullTest) return null;

  if (fullTest.stage === "break") {
    return (
      <>
        {continueError && <Notice tone="error">{continueError}</Notice>}
        <BreakScreen fullTest={fullTest} onContinue={continueToMath} busy={busy} />
      </>
    );
  }

  if (fullTest.stage !== "done") {
    const current = fullTest.stage === "math" ? fullTest.math : fullTest.readingWriting;
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <Badge tone="brand">Full test in progress</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{fullTest.name}</h1>
        <p className="mt-2 text-slate-600">{fullTest.stage === "math" ? "You are in the Math section." : "You are in the Reading and Writing section."}</p>
        {current && (
          <Link href={`/practice/${current.id}`} className="mt-6 inline-block rounded-lg bg-brand-500 px-6 py-3 text-sm font-bold text-white hover:bg-brand-600">
            Resume {fullTest.stage === "math" ? "Math" : "Reading and Writing"}
          </Link>
        )}
      </div>
    );
  }

  const rw = fullTest.readingWriting;
  const math = fullTest.math;
  const pendingScores = rw?.sectionScore == null || math?.sectionScore == null;
  const correct = (rw?.correct ?? 0) + (math?.correct ?? 0);
  const total = (rw?.total ?? 0) + (math?.total ?? 0);
  const timeUsed = (rw?.timeUsedSeconds ?? 0) + (math?.timeUsedSeconds ?? 0);

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge tone="brand">Full Test</Badge>
        {fullTest.timeMultiplier !== 1 && <Badge tone="amber">{multiplierLabel(fullTest.timeMultiplier)}</Badge>}
      </div>
      <PageHeader title={fullTest.name} subtitle={fullTest.completedAt ? `Completed ${new Date(fullTest.completedAt).toLocaleString()}` : undefined} />

      <Card className="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch">
        <div className="text-center sm:w-64 sm:flex-none sm:border-r sm:border-slate-200 sm:pr-6">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Total score</div>
          {fullTest.totalScore !== null ? (
            <>
              <div className="mt-1 text-6xl font-black tracking-tight text-brand-600">{fullTest.totalScore}</div>
              <div className="mt-1 text-xs text-slate-500">on a 400–1600 scale</div>
            </>
          ) : (
            <>
              <div className="mt-1 text-3xl font-bold text-slate-400">Pending</div>
              <div className="mt-1 text-xs text-slate-500">Shown once both section scores are available.</div>
            </>
          )}
        </div>
        <div className="grid w-full flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Reading & Writing", value: rw?.sectionScore ?? "—" },
            { label: "Math", value: math?.sectionScore ?? "—" },
            { label: "Correct", value: `${correct} / ${total}` },
            { label: "Time used", value: formatClock(timeUsed) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-slate-50 px-3 py-4 text-center">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {pendingScores && (
        <div className="mt-4">
          <Notice tone="info">Scaled scores appear once SAT Sharks has entered the score conversion tables. Your answers and counts are already saved.</Notice>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <SectionResult attempt={rw} label="Reading and Writing" />
        <SectionResult attempt={math} label="Math" />
      </div>
    </>
  );
}

export default function FullTestPage() {
  const { id } = useParams<{ id: string }>();
  return <RequireUser studentOnly>{() => <FullTestView id={id} />}</RequireUser>;
}
