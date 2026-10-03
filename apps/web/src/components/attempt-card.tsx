import Link from "next/link";
import { SECTION_LABELS, type AttemptSummary } from "@satsharks/types";
import { Badge, Card } from "./ui";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function progress(attempt: AttemptSummary): string {
  const mock = attempt.mock;
  if (!mock) return `Question ${attempt.lastPosition} of ${attempt.total}`;
  const moduleNumber = mock.currentModule === "m2" ? 2 : 1;
  const inModule = Math.min(Math.max(attempt.lastPosition - mock.moduleStart + 1, 1), mock.moduleQuestionCount);
  return `Module ${moduleNumber}, question ${inModule} of ${mock.moduleQuestionCount}`;
}

export function AttemptCard({ attempt }: { attempt: AttemptSummary }) {
  const done = attempt.status === "done";
  const mock = attempt.mock;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {mock ? <Badge tone="brand">Adaptive Mock</Badge> : <Badge tone="brand">{attempt.paperTitle.split(" — ")[0]}</Badge>}
        <Badge>{SECTION_LABELS[attempt.section]}</Badge>
        {mock?.m2Type && <Badge>{mock.m2Type === "m2_hard" ? "Harder Module 2" : "Easier Module 2"}</Badge>}
        <span className="ml-auto text-xs font-medium text-slate-500">{formatDate(attempt.createdAt)}</span>
      </div>
      <h3 className="text-lg font-bold">{attempt.name}</h3>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-900 px-3 py-2.5 text-sm font-bold">
        {done ? (
          <>
            <span>Score</span>
            <span>
              {attempt.correct} of {attempt.total} correct
            </span>
          </>
        ) : (
          <>
            <span>Progress</span>
            <span className="text-right">{progress(attempt)}</span>
          </>
        )}
      </div>
      <Link
        href={done ? `/practice/${attempt.id}/results` : `/practice/${attempt.id}`}
        className="mt-auto rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-brand-600"
      >
        {done ? "Review Results" : mock ? "Resume Mock" : "Resume Drill"}
      </Link>
    </Card>
  );
}
