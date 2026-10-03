"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AttemptNavItem, AttemptQuestion, AttemptSummary } from "@satsharks/types";
import { Choices, Passage, Prompt, ResponseInput } from "@/components/question";
import { DraggablePanel } from "@/components/draggable-panel";
import { ReferenceSheet } from "@/components/reference-sheet";
import { RequireUser } from "@/components/require-user";
import { Button, Modal, Notice, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

// Desmos's own graphing calculator page for the College Board tests, shown inside our window.
const DESMOS_URL = "https://www.desmos.com/testing/collegeboard/graphing";

type AttemptState = { attempt: AttemptSummary; navigation: AttemptNavItem[] };

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds % 60)}` : `${pad(minutes)}:${pad(seconds % 60)}`;
}

const ICONS = {
  calculator: (
    <>
      <rect x="5" y="2.5" width="14" height="19" rx="2" />
      <path d="M8 6.5h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h3.5" />
    </>
  ),
  reference: <path d="M4 7l6 10M10 7L4 17M14 9c0-1.4 1-2.3 2.3-2.3 1.2 0 2.2.8 2.2 2 0 2-4.5 3.3-4.5 5.3h4.7" />,
  exit: <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h9" />,
} as const;

function ToolButton({ label, icon, onClick, active }: { label: string; icon: keyof typeof ICONS; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex cursor-pointer flex-col items-center rounded px-2 py-1 text-xs font-medium hover:bg-slate-100 ${active ? "bg-slate-100" : ""}`}>
      <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[icon]}
      </svg>
      <span className={active ? "border-b-2 border-slate-900" : ""}>{label}</span>
    </button>
  );
}

// How to type an answer. Written for SAT Sharks; the entry rules follow the Digital SAT.
function SprDirections() {
  return (
    <div className="question-text text-[0.95rem]">
      <p className="font-bold">How to enter your answer</p>
      <ul>
        <li>
          Type <b>one</b> answer, even if more than one would be correct.
        </li>
        <li>
          The box holds <b>5 characters</b>, or <b>6</b> when the answer is negative (the minus sign counts).
        </li>
        <li>
          A <b>fraction</b> too long for the box can be typed as a decimal instead.
        </li>
        <li>
          A <b>decimal</b> too long for the box can be cut off or rounded so that it fills the box.
        </li>
        <li>
          Write a <b>mixed number</b> as an improper fraction or a decimal: one and a half is 3/2 or 1.5.
        </li>
        <li>
          Leave out <b>symbols</b> such as %, commas and $.
        </li>
      </ul>
    </div>
  );
}

function TestScreen({ attemptId, userName }: { attemptId: string; userName: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const attemptQuery = useQuery({
    queryKey: ["practice", "attempt", attemptId],
    queryFn: () => api<AttemptState>(`/api/practice/attempts/${attemptId}`),
    // The server owns the clock and the saved answers: always start from its state.
    staleTime: 0,
    gcTime: 0,
  });

  // The attempt as last reported by the server (replaced when a mock moves to Module 2).
  const [attempt, setAttempt] = useState<AttemptSummary | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [navigation, setNavigation] = useState<AttemptNavItem[]>([]);
  const [question, setQuestion] = useState<AttemptQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [timerHidden, setTimerHidden] = useState(false);
  const [eliminationMode, setEliminationMode] = useState(false);
  const [eliminated, setEliminated] = useState<Record<number, string[]>>({});
  const [panel, setPanel] = useState<"navigator" | "directions" | "finish" | null>(null);
  // The reference sheet is a separate floating window, so it can stay open alongside other panels.
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [moduleNotice, setModuleNotice] = useState<string | null>(null);
  const ending = useRef(false);
  // The typed answer last saved for the current question, to avoid saving unchanged text.
  const savedAnswer = useRef("");

  // Applies a server snapshot: navigation, clock, and where to resume inside the current module.
  const applyState = useCallback(
    (state: AttemptState, resumeAt?: number) => {
      const loaded = state.attempt;
      if (loaded.status === "done") {
        router.replace(`/practice/${attemptId}/results`);
        return;
      }
      const start = loaded.mock?.moduleStart ?? 1;
      const count = loaded.mock?.moduleQuestionCount ?? loaded.total;
      setAttempt(loaded);
      setNavigation(state.navigation);
      setSecondsLeft(loaded.timeRemainingSeconds);
      setPosition(Math.min(Math.max(start, resumeAt ?? loaded.lastPosition), start + count - 1));
    },
    [attemptId, router],
  );

  // Initialise from the server once.
  useEffect(() => {
    if (attemptQuery.data && attempt === null) applyState(attemptQuery.data);
  }, [attemptQuery.data, attempt, applyState]);

  // Load the question whenever the position changes.
  useEffect(() => {
    if (position === null) return;
    let cancelled = false;
    setLoadingQuestion(true);
    setError(null);
    api<{ question: AttemptQuestion }>(`/api/practice/attempts/${attemptId}/questions/${position}`)
      .then(({ question: loaded }) => {
        if (cancelled) return;
        setQuestion(loaded);
        setAnswer(loaded.answer ?? "");
        savedAnswer.current = loaded.answer ?? "";
      })
      .catch((caught: Error) => !cancelled && setError(caught.message))
      .finally(() => !cancelled && setLoadingQuestion(false));
    return () => {
      cancelled = true;
    };
  }, [attemptId, position]);

  const isMock = attempt?.kind === "mock";
  const inModuleOne = isMock && attempt?.mock?.currentModule === "m1";

  const finish = useCallback(async () => {
    if (ending.current) return;
    ending.current = true;
    setBusy(true);
    try {
      await api(`/api/practice/attempts/${attemptId}/end`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["practice", "attempts"] });
      router.replace(`/practice/${attemptId}/results`);
    } catch (caught) {
      ending.current = false;
      setBusy(false);
      setError(caught instanceof Error ? caught.message : "Could not submit");
    }
  }, [attemptId, queryClient, router]);

  // Mock: closes Module 1. The server grades it and builds Module 2 from the score.
  const submitModule = useCallback(async () => {
    if (ending.current) return;
    ending.current = true;
    setBusy(true);
    setPanel(null);
    setQuestion(null);
    try {
      const state = await api<AttemptState>(`/api/practice/attempts/${attemptId}/submit-module`, { method: "POST" });
      setEliminated({});
      applyState(state, state.attempt.mock?.moduleStart);
      setModuleNotice("Module 1 is submitted. Module 2 has started.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit Module 1");
    } finally {
      ending.current = false;
      setBusy(false);
    }
  }, [attemptId, applyState]);

  // Countdown. The server enforces the limit; this only displays it and moves on when it runs out.
  const timed = secondsLeft !== null;
  useEffect(() => {
    if (!timed) return;
    const interval = setInterval(() => setSecondsLeft((value) => (value === null ? null : Math.max(0, value - 1))), 1000);
    return () => clearInterval(interval);
  }, [timed]);
  useEffect(() => {
    if (secondsLeft !== 0) return;
    void (inModuleOne ? submitModule() : finish());
  }, [secondsLeft, inModuleOne, submitModule, finish]);

  useEffect(() => {
    if (!moduleNotice) return;
    const timer = setTimeout(() => setModuleNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [moduleNotice]);

  const save = useCallback(
    async (body: { answer?: string | null; flagged?: boolean }, at: number) => {
      try {
        const { item } = await api<{ item: AttemptNavItem }>(`/api/practice/attempts/${attemptId}/questions/${at}`, { method: "PATCH", body });
        setNavigation((items) => items.map((entry) => (entry.position === item.position ? item : entry)));
        setError(null);
        return true;
      } catch (caught) {
        setError(`Your answer was not saved: ${caught instanceof Error ? caught.message : "connection problem"}. Check your connection and select it again.`);
        return false;
      }
    },
    [attemptId],
  );

  // Typed answers are saved when leaving the field or the question.
  const commitTyped = useCallback(async () => {
    if (!question || question.questionType === "mcq" || question.checked || answer === savedAnswer.current) return true;
    const ok = await save({ answer: answer === "" ? null : answer }, question.position);
    if (ok) savedAnswer.current = answer;
    return ok;
  }, [question, answer, save]);

  const moduleStart = attempt?.mock?.moduleStart ?? 1;
  const moduleCount = attempt?.mock?.moduleQuestionCount ?? attempt?.total ?? 0;
  const moduleEnd = moduleStart + moduleCount - 1;

  const goTo = useCallback(
    async (next: number) => {
      if (next < moduleStart || next > moduleEnd || next === position) return;
      await commitTyped();
      setPanel(null);
      setPosition(next);
    },
    [moduleStart, moduleEnd, position, commitTyped],
  );

  if (attemptQuery.error) return <div className="p-8"><Notice tone="error">{attemptQuery.error.message}</Notice></div>;
  if (!attempt || position === null) {
    return <div className="p-8"><Spinner label={busy ? "Preparing Module 2" : "Loading"} /></div>;
  }

  const math = attempt.section === "math";
  const sectionName = math ? "Math" : "Reading and Writing";
  const moduleNumber = attempt.mock?.currentModule === "m2" ? 2 : 1;
  const title = isMock ? `${sectionName}: Module ${moduleNumber}` : `Section: ${sectionName}`;
  const label = (at: number) => at - moduleStart + 1;
  const current = navigation.find((entry) => entry.position === position);
  const locked = question?.checked ?? false;
  const isSpr = question?.questionType === "spr";
  const split = question ? !math || isSpr : false;
  const crossed = new Set(eliminated[position] ?? []);
  const unanswered = navigation.filter((entry) => !entry.answered).length;
  const endLabel = isMock ? (inModuleOne ? "Submit Module 1" : "Finish Mock") : "Finish Drill";

  async function selectChoice(key: string) {
    if (!question || locked) return;
    const previous = answer;
    setAnswer(key);
    if (!(await save({ answer: key }, question.position))) setAnswer(previous);
  }

  async function toggleFlag() {
    if (!current) return;
    const flagged = !current.flagged;
    setNavigation((items) => items.map((entry) => (entry.position === position ? { ...entry, flagged } : entry)));
    if (!(await save({ flagged }, position!))) {
      setNavigation((items) => items.map((entry) => (entry.position === position ? { ...entry, flagged: !flagged } : entry)));
    }
  }

  async function check() {
    if (!question) return;
    setBusy(true);
    try {
      if (!(await commitTyped())) return;
      const { question: checked } = await api<{ question: AttemptQuestion }>(`/api/practice/attempts/${attemptId}/questions/${question.position}/check`, { method: "POST" });
      setQuestion(checked);
      setNavigation((items) => items.map((entry) => (entry.position === checked.position ? { ...entry, checked: true, answered: true } : entry)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not check the answer");
    } finally {
      setBusy(false);
    }
  }

  const questionPane = question && (
    <div>
      <div className="flex items-center gap-3 bg-slate-100">
        <span className="flex h-9 min-w-9 items-center justify-center bg-slate-900 px-1 text-base font-bold text-white">{label(question.position)}</span>
        <button type="button" onClick={toggleFlag} aria-pressed={current?.flagged ?? false} className="flex cursor-pointer items-center gap-1.5 text-sm font-medium">
          <span aria-hidden className={current?.flagged ? "text-red-600" : "text-slate-700"}>
            {current?.flagged ? "⚑" : "⚐"}
          </span>
          <span className={current?.flagged ? "font-bold" : ""}>Mark for Review</span>
        </button>
        {!isSpr && (
          <button
            type="button"
            onClick={() => setEliminationMode((value) => !value)}
            aria-pressed={eliminationMode}
            title="Cross out answer choices"
            className={`ml-auto mr-2 cursor-pointer rounded border px-1.5 text-xs font-bold line-through ${eliminationMode ? "border-brand-500 bg-brand-500 text-white" : "border-slate-900 bg-white"}`}
          >
            ABC
          </button>
        )}
      </div>
      <div className="test-rule mb-4" />
      <Prompt question={question} />
      {isSpr ? (
        <ResponseInput
          value={answer}
          onChange={setAnswer}
          onCommit={() => void commitTyped()}
          disabled={locked}
          correctAnswer={question.result?.correctAnswer}
          correct={question.result?.correct}
        />
      ) : (
        <Choices
          question={question}
          selected={answer || null}
          onSelect={locked ? undefined : selectChoice}
          eliminationMode={eliminationMode && !locked}
          eliminated={crossed}
          onToggleEliminate={(key) =>
            setEliminated((all) => {
              const list = all[position!] ?? [];
              return { ...all, [position!]: list.includes(key) ? list.filter((item) => item !== key) : [...list, key] };
            })
          }
          correctAnswer={question.result?.correctAnswer}
          disabled={locked}
        />
      )}
      {question.result && (
        <div className={`mt-4 rounded-lg border px-4 py-3 text-sm font-bold ${question.result.correct ? "border-green-600 bg-green-50 text-green-800" : "border-red-600 bg-red-50 text-red-800"}`}>
          {question.result.correct ? "Correct." : "Incorrect."}
          {question.result.explanation && <p className="mt-1 font-normal text-slate-800">{question.result.explanation}</p>}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2 sm:px-8">
        <div>
          <h1 className="text-lg font-bold leading-tight">{title}</h1>
          <button type="button" onClick={() => setPanel(panel === "directions" ? null : "directions")} className="cursor-pointer text-sm font-medium">
            Directions ▾
          </button>
        </div>
        <div className="text-center">
          {timed ? (
            <>
              <div className={`text-xl font-bold tabular-nums ${secondsLeft! <= 300 ? "text-red-600" : ""}`} aria-live="off">
                {timerHidden ? "⏱" : formatTime(secondsLeft!)}
              </div>
              <button type="button" onClick={() => setTimerHidden((value) => !value)} className="cursor-pointer rounded-full border border-slate-900 px-3 text-xs font-bold">
                {timerHidden ? "Show" : "Hide"}
              </button>
            </>
          ) : (
            <span className="text-sm font-medium text-slate-500">Untimed</span>
          )}
        </div>
        <div className="flex items-center justify-end gap-1">
          {math && <ToolButton label="Calculator" icon="calculator" onClick={() => setCalculatorOpen((open) => !open)} active={calculatorOpen} />}
          {math && <ToolButton label="Reference" icon="reference" onClick={() => setReferenceOpen((open) => !open)} active={referenceOpen} />}
          <ToolButton
            label="Exit"
            icon="exit"
            onClick={async () => {
              await commitTyped();
              router.push("/dashboard");
            }}
          />
        </div>
      </header>
      <div className="test-rule" />

      <main className="min-h-0 flex-1 overflow-hidden">
        {(error || moduleNotice) && (
          <div className="mx-auto max-w-3xl space-y-2 px-4 pt-3">
            {moduleNotice && <Notice tone="info">{moduleNotice}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}
          </div>
        )}
        {loadingQuestion || !question ? (
          <div className="mx-auto max-w-3xl px-4">{!error && <Spinner label="Loading question" />}</div>
        ) : split ? (
          <div className="grid h-full grid-cols-1 lg:grid-cols-2">
            <div className="overflow-y-auto border-b-4 border-slate-300 px-5 py-6 sm:px-10 lg:border-b-0 lg:border-r-4">{math ? <SprDirections /> : <Passage question={question} />}</div>
            <div className="overflow-y-auto px-5 py-6 sm:px-10">{questionPane}</div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto px-5 py-6">
            <div className="mx-auto max-w-3xl">{questionPane}</div>
          </div>
        )}
      </main>

      <div className="test-rule" />
      <footer className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 sm:px-8">
        <span className="truncate text-lg font-semibold">{userName}</span>
        <button type="button" onClick={() => setPanel(panel === "navigator" ? null : "navigator")} aria-expanded={panel === "navigator"} className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white">
          Question {label(position)} of {moduleCount} {panel === "navigator" ? "▾" : "▴"}
        </button>
        <div className="flex justify-end gap-2">
          {!isMock && (
            <Button className="rounded-full" disabled={busy || locked || answer === "" || !question} onClick={check}>
              Check
            </Button>
          )}
          <Button className="rounded-full" disabled={position <= moduleStart} onClick={() => goTo(position - 1)}>
            Back
          </Button>
          {position < moduleEnd ? (
            <Button className="rounded-full" onClick={() => goTo(position + 1)}>
              Next
            </Button>
          ) : (
            <Button className="rounded-full" disabled={busy} onClick={async () => (await commitTyped(), setPanel("finish"))}>
              {isMock ? (inModuleOne ? "Submit Module" : "Finish") : "Finish"}
            </Button>
          )}
        </div>

        {panel === "navigator" && (
          <div className="absolute bottom-full left-1/2 z-40 mb-3 w-[min(92vw,500px)] -translate-x-1/2 rounded-xl border border-slate-900 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="mx-auto text-base font-bold">{title} Questions</h2>
              <button type="button" onClick={() => setPanel(null)} aria-label="Close" className="cursor-pointer text-lg">
                ✕
              </button>
            </div>
            <div className="my-3 flex justify-center gap-4 border-b border-slate-300 pb-3 text-xs">
              <span>📍 Current</span>
              <span>
                <span className="mr-1 inline-block h-3 w-3 border border-dashed border-slate-900 align-middle" />
                Unanswered
              </span>
              <span>
                <span className="text-red-600">⚑</span> For Review
              </span>
            </div>
            <div className="grid max-h-56 grid-cols-10 gap-2 overflow-y-auto pt-2">
              {navigation.map((entry) => (
                <button
                  key={entry.position}
                  type="button"
                  onClick={() => goTo(entry.position)}
                  aria-label={`Question ${label(entry.position)}${entry.answered ? ", answered" : ", unanswered"}${entry.flagged ? ", marked for review" : ""}`}
                  className={`relative flex h-8 cursor-pointer items-center justify-center text-sm font-bold ${
                    entry.answered ? "bg-brand-500 text-white" : "border border-dashed border-slate-900 text-brand-500"
                  } ${entry.position === position ? "outline outline-2 outline-offset-2 outline-slate-900" : ""}`}
                >
                  {label(entry.position)}
                  {entry.flagged && <span className="absolute -right-1 -top-2 text-xs text-red-600">⚑</span>}
                </button>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setPanel("finish")}>
                {endLabel}
              </Button>
            </div>
          </div>
        )}
      </footer>

      {/* Floating and draggable, so the question stays visible and usable while they are open.
          Closing the calculator clears its work; reopening starts a fresh one. */}
      {calculatorOpen && (
        <DraggablePanel
          title="Calculator"
          onClose={() => setCalculatorOpen(false)}
          initialX={50}
          initialY={100}
          width={640}
          height={520}
          minWidth={400}
          minHeight={350}
          resizable
          flush
        >
          <iframe
            src={DESMOS_URL}
            title="Desmos graphing calculator"
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms"
            className="h-full w-full border-0"
          />
        </DraggablePanel>
      )}
      {referenceOpen && (
        <DraggablePanel title="Reference" onClose={() => setReferenceOpen(false)}>
          <ReferenceSheet />
        </DraggablePanel>
      )}
      {panel === "directions" && (
        <Modal title="Directions" onClose={() => setPanel(null)}>
          <div className="question-text text-[0.95rem]">
            {math ? (
              <>
                <p>This section tests a range of math skills. You may use the calculator on every question.</p>
                <p>Unless a question says otherwise, every variable and expression stands for a real number, figures are drawn to scale and lie in a plane, and a function is defined for every real number it can take.</p>
                <p>Multiple-choice questions have exactly one correct answer. For the others, type your answer in the box.</p>
              </>
            ) : (
              <>
                <p>This section tests reading and writing skills. Each question comes with one or two short passages, which may include a table or graph.</p>
                <p>Read the passage and the question, then pick the best of the four choices. Each question has a single best answer.</p>
              </>
            )}
            {isMock && (
              <p>
                This is an adaptive mock. Module 2 is harder or easier depending on how you do in Module 1. Once a module is submitted, you cannot go back to it.
              </p>
            )}
          </div>
        </Modal>
      )}
      {panel === "finish" && (
        <Modal title={isMock ? (inModuleOne ? "Submit Module 1?" : "Finish this mock?") : "Finish this drill?"} onClose={() => !busy && setPanel(null)}>
          <p className="text-sm">
            {unanswered > 0 ? (
              <>
                You have <b>{unanswered}</b> unanswered question{unanswered === 1 ? "" : "s"} in this {isMock ? "module" : "drill"}.{" "}
              </>
            ) : (
              <>You have answered every question in this {isMock ? "module" : "drill"}. </>
            )}
            {inModuleOne ? "Once you submit Module 1 you cannot return to it. Module 2 starts straight away." : "After you finish, answers cannot be changed."}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setPanel(null)}>
              Keep working
            </Button>
            <Button disabled={busy} onClick={inModuleOne ? submitModule : finish}>
              {busy ? "Submitting…" : inModuleOne ? "Submit Module 1" : "Finish and see results"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function TestPage() {
  const { id } = useParams<{ id: string }>();
  return <RequireUser>{(user) => <TestScreen attemptId={id} userName={user.name} />}</RequireUser>;
}
