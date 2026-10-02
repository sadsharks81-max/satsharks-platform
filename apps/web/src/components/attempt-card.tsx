import Link from "next/link";
import { SECTION_LABELS, type AttemptSummary } from "@satsharks/types";
import { Badge, Card } from "./ui";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function AttemptCard({ attempt }: { attempt: AttemptSummary }) {
  const done = attempt.status === "done";
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{attempt.paperTitle.split(" — ")[0]}</Badge>
        <Badge>{SECTION_LABELS[attempt.section]}</Badge>
        <span className="ml-auto text-xs font-medium text-slate-500">{formatDate(attempt.createdAt)}</span>
      </div>
      <h3 className="text-lg font-bold">{attempt.name}</h3>
      <div className="flex items-center justify-between rounded-lg border border-slate-900 px-3 py-2.5 text-sm font-bold">
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
            <span>
              Question {attempt.lastPosition} of {attempt.total}
            </span>
          </>
        )}
      </div>
      <Link
        href={done ? `/practice/${attempt.id}/results` : `/practice/${attempt.id}`}
        className="mt-auto rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-brand-600"
      >
        {done ? "Review Results" : "Resume Drill"}
      </Link>
    </Card>
  );
}
