"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SECTION_LABELS, type AttemptSummary, type FullTestSummary } from "@satsharks/types";
import { api } from "@/lib/api";
import { Badge, Button, Card, Modal, Notice } from "./ui";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function progress(attempt: AttemptSummary): string {
  const mock = attempt.mock;
  if (!mock) return `Question ${attempt.lastPosition} of ${attempt.total}`;
  const moduleNumber = mock.currentModule === "m2" ? 2 : 1;
  const inModule = Math.min(Math.max(attempt.lastPosition - mock.moduleStart + 1, 1), mock.moduleQuestionCount);
  return `Module ${moduleNumber}, question ${inModule} of ${mock.moduleQuestionCount}`;
}

const primaryLink = "flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-brand-600";

// Deleting is permanent, so it is confirmed in a dialog first.
function DeleteButton({ path, what, name }: { path: string; what: string; name: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api(path, { method: "DELETE" });
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["practice"] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${what}`}
        title={`Delete ${what}`}
        className="flex h-[42px] w-[42px] flex-none cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition hover:border-red-600 hover:bg-red-50 hover:text-red-600"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3" />
        </svg>
      </button>
      {open && (
        <Modal title={`Delete this ${what}?`} onClose={() => !busy && setOpen(false)}>
          <p className="text-sm text-slate-700">
            <b>{name}</b> and all its answers{what === "full test" ? " in both sections" : ""} will be deleted. This cannot be undone.
          </p>
          {error && (
            <div className="mt-3">
              <Notice tone="error">{error}</Notice>
            </div>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={busy} onClick={remove}>
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function AttemptCard({ attempt }: { attempt: AttemptSummary }) {
  const done = attempt.status === "done";
  const mock = attempt.mock;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {attempt.fullTestId ? <Badge tone="brand">Full Test</Badge> : mock ? <Badge tone="brand">Adaptive Mock</Badge> : <Badge tone="brand">{attempt.paperTitle.split(" — ")[0]}</Badge>}
        <Badge>{SECTION_LABELS[attempt.section]}</Badge>
        {mock?.m2Type && <Badge>{mock.m2Type === "m2_hard" ? "Harder Module 2" : "Easier Module 2"}</Badge>}
        {attempt.timeMultiplier !== 1 && <Badge tone="amber">{attempt.timeMultiplier}× time</Badge>}
        <span className="ml-auto text-xs font-medium text-slate-500">{formatDate(attempt.createdAt)}</span>
      </div>
      <h3 className="text-lg font-bold">{attempt.name}</h3>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-900 px-3 py-2.5 text-sm font-bold">
        {done ? (
          <>
            <span>{attempt.sectionScore !== null ? "Section score" : "Score"}</span>
            <span className="text-right">
              {attempt.sectionScore !== null ? (
                <>
                  <span className="text-brand-600">{attempt.sectionScore}</span>
                  <span className="font-medium text-slate-500"> · {attempt.correct}/{attempt.total} correct</span>
                </>
              ) : (
                `${attempt.correct} of ${attempt.total} correct`
              )}
            </span>
          </>
        ) : (
          <>
            <span>Progress</span>
            <span className="text-right">{progress(attempt)}</span>
          </>
        )}
      </div>
      <div className="mt-auto flex gap-2">
        <Link href={done ? `/practice/${attempt.id}/results` : `/practice/${attempt.id}`} className={primaryLink}>
          {done ? "Review Results" : mock ? "Resume Mock" : "Resume Drill"}
        </Link>
        {/* A full-test section is deleted with its full test, from the full-test card. */}
        {!attempt.fullTestId && <DeleteButton path={`/api/practice/attempts/${attempt.id}`} what={mock ? "mock" : "drill"} name={attempt.name} />}
      </div>
    </Card>
  );
}

const STAGE_LABEL = { reading_writing: "Reading and Writing in progress", break: "On the break before Math", math: "Math in progress", done: "Completed" } as const;

export function FullTestCard({ fullTest }: { fullTest: FullTestSummary }) {
  const done = fullTest.stage === "done";
  const current = fullTest.stage === "math" ? fullTest.math : fullTest.stage === "reading_writing" ? fullTest.readingWriting : null;
  // A running section opens the test screen; the break and the results live on the full-test page.
  const href = current && current.status === "active" ? `/practice/${current.id}` : `/full-tests/${fullTest.id}`;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">Full Test</Badge>
        <Badge>Both sections</Badge>
        {fullTest.timeMultiplier !== 1 && <Badge tone="amber">{fullTest.timeMultiplier}× time</Badge>}
        <span className="ml-auto text-xs font-medium text-slate-500">{formatDate(fullTest.createdAt)}</span>
      </div>
      <h3 className="text-lg font-bold">{fullTest.name}</h3>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-900 px-3 py-2.5 text-sm font-bold">
        {done ? (
          <>
            <span>Total score</span>
            <span className={fullTest.totalScore !== null ? "text-brand-600" : "text-slate-500"}>{fullTest.totalScore ?? "Pending"}</span>
          </>
        ) : (
          <>
            <span>Progress</span>
            <span className="text-right">{STAGE_LABEL[fullTest.stage]}</span>
          </>
        )}
      </div>
      <div className="mt-auto flex gap-2">
        <Link href={href} className={primaryLink}>
          {done ? "View Results" : fullTest.stage === "break" ? "Continue to Math" : "Resume Full Test"}
        </Link>
        <DeleteButton path={`/api/practice/full-tests/${fullTest.id}`} what="full test" name={fullTest.name} />
      </div>
    </Card>
  );
}
