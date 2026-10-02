"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SECTION_LABELS, type AttemptSummary, type ReviewQuestion } from "@satsharks/types";
import { Choices, Passage, Prompt, ResponseInput } from "@/components/question";
import { RequireUser } from "@/components/require-user";
import { Badge, Button, Card, Modal, Notice, PageHeader, Spinner, Toggle } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

type Filter = "all" | "correct" | "incorrect" | "unanswered" | "flagged";

function statusOf(question: ReviewQuestion): "correct" | "incorrect" | "unanswered" {
  if (question.answer === null) return "unanswered";
  return question.result.correct ? "correct" : "incorrect";
}

const TONE = { correct: "green", incorrect: "red", unanswered: "amber" } as const;

function correctLabel(question: ReviewQuestion): string {
  const key = question.result.correctAnswer;
  if (!key) return "—";
  return question.questionType === "mcq" ? (key.choiceKey ?? "—") : key.acceptedValues.join(", ");
}

function Results({ attemptId }: { attemptId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["practice", "result", attemptId],
    queryFn: () => api<{ attempt: AttemptSummary; questions: ReviewQuestion[] }>(`/api/practice/attempts/${attemptId}/result`),
    retry: false,
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [openPosition, setOpenPosition] = useState<number | null>(null);

  if (isLoading) return <Spinner label="Loading results" />;
  if (error) {
    // 409 = the drill has not been submitted yet.
    return error instanceof ApiError && error.status === 409 ? (
      <Notice tone="info">
        This drill is still in progress.{" "}
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
  const visible = questions.filter((question) => filter === "all" || (filter === "flagged" ? question.flagged : statusOf(question) === filter));
  const openIndex = visible.findIndex((question) => question.position === openPosition);
  const open = openIndex >= 0 ? visible[openIndex]! : null;
  const percent = attempt.total > 0 ? Math.round((attempt.correct / attempt.total) * 100) : 0;
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: `All (${questions.length})` },
    { id: "correct", label: `Correct (${attempt.correct})` },
    { id: "incorrect", label: `Incorrect (${attempt.incorrect})` },
    { id: "unanswered", label: `Unanswered (${attempt.unanswered})` },
    { id: "flagged", label: `For review (${questions.filter((question) => question.flagged).length})` },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{attempt.paperTitle.split(" — ")[0]}</Badge>
        <Badge>{SECTION_LABELS[attempt.section]}</Badge>
      </div>
      <PageHeader title={attempt.name} subtitle={attempt.completedAt ? `Completed ${new Date(attempt.completedAt).toLocaleString()}` : undefined} />

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Score", value: `${percent}%` },
          { label: "Correct", value: attempt.correct },
          { label: "Incorrect", value: attempt.incorrect },
          { label: "Unanswered", value: attempt.unanswered },
        ].map((stat) => (
          <Card key={stat.label} className="text-center">
            <div className="text-3xl font-bold">{stat.value}</div>
            <div className="mt-1 text-sm font-medium text-slate-600">{stat.label}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((entry) => (
          <Toggle key={entry.id} active={filter === entry.id} onClick={() => setFilter(entry.id)}>
            {entry.label}
          </Toggle>
        ))}
      </div>

      <Card className="mt-4 p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-900 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Skill</th>
                <th className="px-4 py-3">Your answer</th>
                <th className="px-4 py-3">Correct answer</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visible.map((question) => {
                const status = statusOf(question);
                return (
                  <tr key={question.position}>
                    <td className="px-4 py-2.5 font-bold">
                      {question.position}
                      {question.flagged && <span className="ml-1 text-red-600">⚑</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={TONE[status]}>{status}</Badge>
                    </td>
                    <td className="px-4 py-2.5">{question.topic ?? "—"}</td>
                    <td className="px-4 py-2.5">{question.skill ?? "—"}</td>
                    <td className="px-4 py-2.5">{question.answer ?? "—"}</td>
                    <td className="px-4 py-2.5">{correctLabel(question)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="outline" size="sm" onClick={() => setOpenPosition(question.position)}>
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No questions match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {open && (
        <Modal title={`Question ${open.position}`} onClose={() => setOpenPosition(null)} wide>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone={TONE[statusOf(open)]}>{statusOf(open)}</Badge>
            {open.skill && <Badge>{open.skill}</Badge>}
            <span className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" disabled={openIndex <= 0} onClick={() => setOpenPosition(visible[openIndex - 1]!.position)}>
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
    </>
  );
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  return <RequireUser>{() => <Results attemptId={id} />}</RequireUser>;
}
