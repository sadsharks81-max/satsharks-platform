"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MOCK_MODULE_LABELS, SECTION_LABELS, type AttemptSummary, type ModuleResult, type ReviewQuestion } from "@satsharks/types";
import { Choices, Passage, Prompt, ResponseInput } from "@/components/question";
import { ReportProblemDialog } from "@/components/report-ui";
import { RequireUser } from "@/components/require-user";
import { Badge, Button, Card, Modal, Notice, PageHeader, Spinner, Toggle } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatClock, formatShortDuration, multiplierLabel } from "@/lib/format";

type Filter = "all" | "correct" | "incorrect" | "unanswered" | "flagged";

function statusOf(question: ReviewQuestion): "correct" | "incorrect" | "unanswered" {
  if (question.answer === null) return "unanswered";
  return question.result.correct ? "correct" : "incorrect";
}

const TONE = { correct: "green", incorrect: "red", unanswered: "amber" } as const;
const STATUS_LABEL = { correct: "Correct", incorrect: "Incorrect", unanswered: "Skipped" } as const;

function correctLabel(question: ReviewQuestion): string {
  const key = question.result.correctAnswer;
  if (!key) return "—";
  return question.questionType === "mcq" ? (key.choiceKey ?? "—") : key.acceptedValues.join(", ");
}

// Correct / incorrect / skipped as a single bar, so the split reads at a glance.
function SplitBar({ correct, incorrect, skipped }: { correct: number; incorrect: number; skipped: number }) {
  const total = Math.max(1, correct + incorrect + skipped);
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden>
      <span className="bg-green-600" style={{ width: `${(correct / total) * 100}%` }} />
      <span className="bg-red-500" style={{ width: `${(incorrect / total) * 100}%` }} />
      <span className="bg-amber-400" style={{ width: `${(skipped / total) * 100}%` }} />
    </div>
  );
}

function Counts({ correct, incorrect, skipped, total }: { correct: number; incorrect: number; skipped: number; total: number }) {
  return (
    <dl className="grid grid-cols-4 gap-2 text-center">
      {[
        { label: "Questions", value: total, tone: "text-slate-900" },
        { label: "Correct", value: correct, tone: "text-green-700" },
        { label: "Incorrect", value: incorrect, tone: "text-red-700" },
        { label: "Skipped", value: skipped, tone: "text-amber-700" },
      ].map((entry) => (
        <div key={entry.label} className="rounded-lg bg-slate-50 px-1 py-2">
          <dd className={`text-xl font-bold sm:text-2xl ${entry.tone}`}>{entry.value}</dd>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">{entry.label}</dt>
        </div>
      ))}
    </dl>
  );
}

function ModuleCard({ result, routingNote }: { result: ModuleResult; routingNote: string | null }) {
  const title = result.module === "m1" ? "Module 1" : result.route ? MOCK_MODULE_LABELS[result.route] : "Module 2";
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold">{title}</h3>
        <span className="text-sm text-slate-600">
          Time used:{" "}
          <b className="text-slate-900">{result.timeUsedSeconds !== null ? formatClock(result.timeUsedSeconds) : "not recorded"}</b>
          {result.timeLimitSeconds !== null && result.timeUsedSeconds !== null && <> of {formatClock(result.timeLimitSeconds)}</>}
        </span>
      </div>
      <Counts correct={result.correct} incorrect={result.incorrect} skipped={result.skipped} total={result.total} />
      <SplitBar correct={result.correct} incorrect={result.incorrect} skipped={result.skipped} />
      {routingNote && <p className="text-xs text-slate-600">{routingNote}</p>}
    </Card>
  );
}

// The headline: the section score for a mock, the percentage for a drill.
function ScoreHero({ attempt }: { attempt: AttemptSummary }) {
  const mock = attempt.mock;
  const percent = attempt.total > 0 ? Math.round((attempt.correct / attempt.total) * 100) : 0;
  const finishedModuleTwo = !!mock?.m2Type;
  return (
    <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="text-center sm:w-56 sm:flex-none sm:border-r sm:border-slate-200 sm:pr-5">
        {mock ? (
          attempt.sectionScore !== null ? (
            <>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{SECTION_LABELS[attempt.section]} score</div>
              <div className="mt-1 text-5xl font-black tracking-tight text-brand-600">{attempt.sectionScore}</div>
              <div className="mt-1 text-xs text-slate-500">on a 200–800 scale</div>
            </>
          ) : (
            <>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{SECTION_LABELS[attempt.section]} score</div>
              <div className="mt-1 text-2xl font-bold text-slate-400">Pending</div>
              <div className="mt-1 text-xs text-slate-500">
                {finishedModuleTwo ? "Shown once SAT Sharks has entered the score conversion table." : "Not scored: the mock ended before Module 2."}
              </div>
            </>
          )
        ) : (
          <>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Accuracy</div>
            <div className="mt-1 text-5xl font-black tracking-tight text-brand-600">{percent}%</div>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <Counts correct={attempt.correct} incorrect={attempt.incorrect} skipped={attempt.unanswered} total={attempt.total} />
        <SplitBar correct={attempt.correct} incorrect={attempt.incorrect} skipped={attempt.unanswered} />
        <p className="text-sm text-slate-600">
          {attempt.correct} of {attempt.total} correct ({percent}%)
          {attempt.timeUsedSeconds !== null && (
            <>
              {" "}
              · Time used <b className="text-slate-900">{formatClock(attempt.timeUsedSeconds)}</b>
            </>
          )}
          {attempt.timed && attempt.timeMultiplier !== 1 && <> · {multiplierLabel(attempt.timeMultiplier)}</>}
        </p>
      </div>
    </Card>
  );
}

function Results({ attemptId }: { attemptId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["practice", "result", attemptId],
    queryFn: () => api<{ attempt: AttemptSummary; questions: ReviewQuestion[] }>(`/api/practice/attempts/${attemptId}/result`),
    retry: false,
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [moduleFilter, setModuleFilter] = useState<"all" | "m1" | "m2">("all");
  const [openPosition, setOpenPosition] = useState<number | null>(null);
  const [reporting, setReporting] = useState(false);

  if (isLoading) return <Spinner label="Loading results" />;
  if (error) {
    // 409 = the attempt has not been submitted yet.
    return error instanceof ApiError && error.status === 409 ? (
      <Notice tone="info">
        This is still in progress.{" "}
        <Link href={`/practice/${attemptId}`} className="font-bold text-brand-500 hover:underline">
          Resume it
        </Link>
      </Notice>
    ) : (
      <Notice tone="error">{error.message}</Notice>
    );
  }
  if (!data) return null;

  const { attempt, questions } = data;
  const mock = attempt.mock;
  // In a mock, questions are numbered within their module, as on the test screen.
  const number = (question: ReviewQuestion) => (mock && question.module && question.module !== "m1" ? question.position - mock.m1Total : question.position);
  const moduleLabel = (question: ReviewQuestion) => (question.module ? (question.module === "m1" ? "Module 1" : "Module 2") : null);
  const visible = questions.filter(
    (question) =>
      (moduleFilter === "all" || (moduleFilter === "m1" ? question.module === "m1" : question.module !== "m1")) &&
      (filter === "all" || (filter === "flagged" ? question.flagged : statusOf(question) === filter)),
  );
  const openIndex = visible.findIndex((question) => question.position === openPosition);
  const open = openIndex >= 0 ? visible[openIndex]! : null;
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `All (${questions.length})` },
    { id: "correct", label: `Correct (${attempt.correct})` },
    { id: "incorrect", label: `Incorrect (${attempt.incorrect})` },
    { id: "unanswered", label: `Skipped (${attempt.unanswered})` },
    { id: "flagged", label: `For review (${questions.filter((question) => question.flagged).length})` },
  ];
  const routingNote =
    mock?.routingRequiredCorrect != null ? `The harder Module 2 needed ${mock.routingRequiredCorrect} of ${mock.m1Total} correct in Module 1; you had ${mock.m1Correct ?? 0}.` : null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{attempt.fullTestId ? "Full Test" : mock ? "Adaptive Mock" : attempt.paperTitle.split(" — ")[0]}</Badge>
        <Badge>{SECTION_LABELS[attempt.section]}</Badge>
        {mock && <Badge>{attempt.paperTitle}</Badge>}
        {attempt.timeMultiplier !== 1 && <Badge tone="amber">{attempt.timeMultiplier}× time</Badge>}
      </div>
      <PageHeader title={attempt.name} subtitle={attempt.completedAt ? `Completed ${new Date(attempt.completedAt).toLocaleString()}` : undefined} />

      {attempt.fullTestId && (
        <div className="mb-4">
          <Notice tone="info">
            This section is part of a full test.{" "}
            <Link href={`/full-tests/${attempt.fullTestId}`} className="font-bold text-brand-500 hover:underline">
              See the total score
            </Link>
          </Notice>
        </div>
      )}

      <ScoreHero attempt={attempt} />

      {attempt.modules.length > 0 && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {attempt.modules.map((result) => (
            <ModuleCard key={result.module} result={result} routingNote={result.module === "m2" ? routingNote : null} />
          ))}
        </div>
      )}

      <h2 className="mt-8 text-xl font-bold tracking-tight">Question review</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {mock &&
          (["all", "m1", "m2"] as const).map((entry) => (
            <Toggle key={entry} active={moduleFilter === entry} onClick={() => setModuleFilter(entry)}>
              {entry === "all" ? "Both modules" : entry === "m1" ? "Module 1" : "Module 2"}
            </Toggle>
          ))}
        {mock && <span aria-hidden className="mx-1 hidden w-px self-stretch bg-slate-300 sm:block" />}
        {filters.map((entry) => (
          <Toggle key={entry.id} active={filter === entry.id} onClick={() => setFilter(entry.id)}>
            {entry.label}
          </Toggle>
        ))}
      </div>

      <Card className="mt-4 p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-900 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-3 sm:px-4">#</th>
                {mock && <th className="hidden px-3 py-3 sm:table-cell">Module</th>}
                <th className="px-3 py-3">Status</th>
                <th className="hidden px-3 py-3 lg:table-cell">Topic</th>
                <th className="hidden px-3 py-3 md:table-cell">Skill</th>
                <th className="px-3 py-3">
                  <span className="sm:hidden">You / Key</span>
                  <span className="hidden sm:inline">Your answer</span>
                </th>
                <th className="hidden px-3 py-3 sm:table-cell">Correct answer</th>
                <th className="hidden px-3 py-3 sm:table-cell">Time</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visible.map((question) => {
                const status = statusOf(question);
                return (
                  <tr key={question.position}>
                    <td className="px-3 py-2.5 font-bold sm:px-4">
                      {number(question)}
                      {question.flagged && <span className="ml-1 text-red-600">⚑</span>}
                      {mock && <span className="block text-[11px] font-normal text-slate-500 sm:hidden">{question.module === "m1" ? "M1" : "M2"}</span>}
                    </td>
                    {mock && <td className="hidden px-3 py-2.5 whitespace-nowrap sm:table-cell">{moduleLabel(question)}</td>}
                    <td className="px-3 py-2.5">
                      <Badge tone={TONE[status]}>{STATUS_LABEL[status]}</Badge>
                    </td>
                    <td className="hidden px-3 py-2.5 lg:table-cell">{question.topic ?? "—"}</td>
                    <td className="hidden px-3 py-2.5 md:table-cell">{question.skill ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      {question.answer ?? "—"}
                      <span className="text-slate-500 sm:hidden"> / {correctLabel(question)}</span>
                    </td>
                    <td className="hidden px-3 py-2.5 sm:table-cell">{correctLabel(question)}</td>
                    <td className="hidden px-3 py-2.5 whitespace-nowrap tabular-nums text-slate-600 sm:table-cell">{formatShortDuration(question.timeSpentSeconds)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Button variant="outline" size="sm" onClick={() => setOpenPosition(question.position)}>
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                    No questions match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {open && !reporting && (
        <Modal title={`${moduleLabel(open) ? `${moduleLabel(open)}, question` : "Question"} ${number(open)}`} onClose={() => setOpenPosition(null)} wide>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone={TONE[statusOf(open)]}>{STATUS_LABEL[statusOf(open)]}</Badge>
            {open.skill && <Badge>{open.skill}</Badge>}
            <span className="text-xs text-slate-500">Time on question: {formatShortDuration(open.timeSpentSeconds)}</span>
            <span className="flex w-full gap-2 sm:ml-auto sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => setReporting(true)}>
                Report a problem
              </Button>
              <Button variant="outline" size="sm" className="ml-auto sm:ml-0" disabled={openIndex <= 0} onClick={() => setOpenPosition(visible[openIndex - 1]!.position)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={openIndex >= visible.length - 1} onClick={() => setOpenPosition(visible[openIndex + 1]!.position)}>
                Next
              </Button>
            </span>
          </div>
          <div className="mx-auto max-w-3xl">
            {open.section !== "math" && <Passage question={open} />}
            <div className={open.section !== "math" ? "mt-5 border-t border-slate-300 pt-5" : ""}>
              <Prompt question={open} />
            </div>
            {open.questionType === "mcq" ? (
              <Choices question={open} selected={open.answer} correctAnswer={open.result.correctAnswer} disabled />
            ) : (
              <ResponseInput value={open.answer ?? ""} disabled correctAnswer={open.result.correctAnswer} correct={open.result.correct} />
            )}
            {open.result.explanation && <p className="question-text mt-5 border-t border-slate-300 pt-4">{open.result.explanation}</p>}
          </div>
        </Modal>
      )}
      {open && reporting && (
        <ReportProblemDialog
          attemptId={attemptId}
          position={open.position}
          questionLabel={`${moduleLabel(open) ? `${moduleLabel(open)}, question` : "question"} ${number(open)}`}
          onClose={() => setReporting(false)}
        />
      )}
    </>
  );
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  return <RequireUser studentOnly>{() => <Results attemptId={id} />}</RequireUser>;
}
