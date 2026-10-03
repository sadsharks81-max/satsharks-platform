"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MOCK_FORMAT, SECTION_LABELS, type AttemptSummary, type PracticeCatalog, type Section } from "@satsharks/types";
import { api } from "@/lib/api";
import { Modal, Notice } from "./ui";

const option = (active: boolean) =>
  `min-h-[40px] cursor-pointer rounded-[8px] border px-3.5 py-2 text-left text-[13px] font-bold transition-colors ${
    active ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500/20" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
  }`;

export function CreateMock({ catalog, onClose }: { catalog: PracticeCatalog; onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>("math");
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [timed, setTimed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const format = MOCK_FORMAT[section];
  // Only exams that have questions in the chosen section can be part of the pool.
  const exams = useMemo(() => catalog.exams.filter((exam) => exam.sections[section]), [catalog, section]);
  const paperIds = selected.map((examId) => exams.find((exam) => exam.examId === examId)?.sections[section]?.paperId).filter((id): id is string => !!id);
  const poolSize = (selected.length === 0 ? exams : exams.filter((exam) => selected.includes(exam.examId))).reduce(
    (sum, exam) => sum + (exam.sections[section]?.questionCount ?? 0),
    0,
  );
  const needed = format.questionsPerModule * 2;

  const toggle = (examId: string) => setSelected((list) => (list.includes(examId) ? list.filter((id) => id !== examId) : [...list, examId]));
  const changeSection = (next: Section) => {
    setSection(next);
    setSelected([]);
  };

  async function start() {
    setSubmitting(true);
    setError(null);
    try {
      const { attempt } = await api<{ attempt: AttemptSummary }>("/api/practice/mocks", {
        method: "POST",
        body: { section, paperIds, timed, name: name.trim() },
      });
      await queryClient.invalidateQueries({ queryKey: ["practice", "attempts"] });
      router.push(`/practice/${attempt.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the mock");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Start Adaptive Mock Exam" onClose={onClose} wide>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <div>
            <span className="mb-2 block text-sm font-bold">Target Section</span>
            <div className="grid grid-cols-2 gap-2">
              {(["math", "reading_writing"] as const).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => changeSection(entry)}
                  className={`h-[42px] cursor-pointer rounded-[8px] border text-sm font-bold ${
                    section === entry ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {entry === "math" ? "Math Section" : "Reading & Writing"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold">Exam Question Pool</span>
              <span className="text-xs font-bold text-brand-500">{selected.length === 0 ? "All exams selected" : `${selected.length} selected`}</span>
            </div>
            {exams.length === 0 ? (
              <Notice tone="info">No published exams have {SECTION_LABELS[section]} questions yet.</Notice>
            ) : (
              <div className="grid max-h-[290px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                <button type="button" aria-pressed={selected.length === 0} onClick={() => setSelected([])} className={option(selected.length === 0)}>
                  All Exams
                </button>
                {exams.map((exam) => (
                  <button key={exam.examId} type="button" aria-pressed={selected.includes(exam.examId)} onClick={() => toggle(exam.examId)} className={`${option(selected.includes(exam.examId))} truncate`} title={exam.name}>
                    {exam.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-300 bg-slate-50 p-5">
          <dl className="space-y-2 rounded-lg border border-slate-300 bg-white p-4 text-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Format</div>
            <div className="flex justify-between gap-3">
              <dt className="font-semibold">Section</dt>
              <dd>{SECTION_LABELS[section]}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-semibold">Questions</dt>
              <dd>
                {needed} ({format.questionsPerModule} per module, 2 modules)
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-semibold">Time</dt>
              <dd>
                {format.minutesPerModule * 2} minutes ({format.minutesPerModule} per module)
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-semibold">Questions in pool</dt>
              <dd className={poolSize < needed ? "font-bold text-red-700" : ""}>{poolSize.toLocaleString()}</dd>
            </div>
          </dl>

          <label className="block text-sm font-bold">
            Mock Title (Optional)
            <input
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder={`e.g. ${SECTION_LABELS[section]} mock 1`}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </label>

          <label className="flex h-10 cursor-pointer items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold">
            Official Countdown
            <input type="checkbox" checked={timed} onChange={(event) => setTimed(event.target.checked)} className="h-4 w-4 accent-brand-500" />
          </label>

          <p className="text-xs text-slate-600">Module 2 adapts to your Module 1 result. A submitted module cannot be reopened.</p>
          {poolSize < needed && exams.length > 0 && <Notice tone="error">These exams have fewer than {needed} questions. Choose more exams.</Notice>}
          {error && <Notice tone="error">{error}</Notice>}

          <button
            type="button"
            disabled={submitting || exams.length === 0 || poolSize < needed}
            onClick={start}
            className="h-[42px] w-full cursor-pointer rounded-[10px] bg-brand-500 text-[14px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Starting…" : `Start Adaptive Mock (${selected.length === 0 ? "All Exams" : `${selected.length} Selected`})`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
