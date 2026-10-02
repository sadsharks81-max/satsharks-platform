// Finds attempts among recorded RPC calls and groups everything that belongs to one.
//
// The source app has two attempt kinds with parallel function names:
//   mock  (adaptive): mStart -> mGetAttempt -> mGet ... -> mEndModule1 -> mGet ... -> mEnd -> mrGetResult
//   drill (practice): pFilter -> pStart -> pGetAttempt -> pGet ... [pCheckQuestion] -> pEnd -> rpGetResult
import { isRecord } from "@satsharks/utils";
import type { RpcCall } from "./client";

export type AttemptKind = "mock" | "drill";

type Role = "start" | "attempt" | "question" | "answer" | "check" | "endModule1" | "end" | "result";

const FUNCTIONS: Record<string, { kind: AttemptKind; role: Role }> = {
  mStart: { kind: "mock", role: "start" },
  mGetAttempt: { kind: "mock", role: "attempt" },
  mGet: { kind: "mock", role: "question" },
  mAnswer: { kind: "mock", role: "answer" },
  mEndModule1: { kind: "mock", role: "endModule1" },
  mEnd: { kind: "mock", role: "end" },
  mrGetResult: { kind: "mock", role: "result" },
  pStart: { kind: "drill", role: "start" },
  pGetAttempt: { kind: "drill", role: "attempt" },
  pGet: { kind: "drill", role: "question" },
  pAnswer: { kind: "drill", role: "answer" },
  pCheckQuestion: { kind: "drill", role: "check" },
  pEnd: { kind: "drill", role: "end" },
  rpGetResult: { kind: "drill", role: "result" },
};

export interface DiscoveredAttempt {
  id: string;
  kind: AttemptKind;
}

export interface AttemptCapture extends DiscoveredAttempt {
  // Every call for this attempt, in order. This is what gets saved as raw data.
  calls: RpcCall[];
  start: RpcCall | null;
  // Drill only: the question-selection call made just before the drill was started.
  filter: RpcCall | null;
  attemptSnapshots: RpcCall[];
  // afterModule1End: the call happened after Module 1 was submitted, i.e. it is a Module 2 question.
  questionCalls: { call: RpcCall; afterModule1End: boolean }[];
  // Drill only: single-question answer checks. Same shape as a result question.
  checkCalls: RpcCall[];
  endModule1: RpcCall | null;
  end: RpcCall | null;
  result: RpcCall | null;
  // Exam-source catalogue, if the app happened to load it while recording.
  metadata: RpcCall | null;
}

function attemptIdOf(call: RpcCall): string | null {
  if (isRecord(call.request) && typeof call.request.p_attempt_id === "string") return call.request.p_attempt_id;
  // Start calls take no attempt ID; they return the new one.
  if (FUNCTIONS[call.fn]?.role === "start" && typeof call.response === "string") return call.response;
  return null;
}

export function discoverAttempts(calls: RpcCall[]): DiscoveredAttempt[] {
  const found = new Map<string, DiscoveredAttempt>();
  for (const call of calls) {
    const fn = FUNCTIONS[call.fn];
    const id = fn ? attemptIdOf(call) : null;
    if (fn && id && !found.has(id)) found.set(id, { id, kind: fn.kind });
  }
  return [...found.values()];
}

export function captureAttempt(calls: RpcCall[], attempt: DiscoveredAttempt): AttemptCapture {
  const capture: AttemptCapture = {
    ...attempt,
    calls: [],
    start: null,
    filter: null,
    attemptSnapshots: [],
    questionCalls: [],
    checkCalls: [],
    endModule1: null,
    end: null,
    result: null,
    metadata: calls.findLast((call) => call.fn === "getQsMetadata" && call.status === 200) ?? null,
  };

  let lastFilter: RpcCall | null = null;
  for (const call of calls) {
    if (call.fn === "pFilter" && call.status === 200) lastFilter = call;

    const fn = FUNCTIONS[call.fn];
    if (!fn || fn.kind !== attempt.kind || attemptIdOf(call) !== attempt.id) continue;
    capture.calls.push(call);
    if (call.status !== 200) continue;

    switch (fn.role) {
      case "start":
        capture.start = call;
        capture.filter = attempt.kind === "drill" ? lastFilter : null;
        break;
      case "attempt":
        capture.attemptSnapshots.push(call);
        break;
      case "question":
        capture.questionCalls.push({ call, afterModule1End: capture.endModule1 !== null });
        break;
      case "check":
        capture.checkCalls.push(call);
        break;
      case "endModule1":
        capture.endModule1 = call;
        break;
      case "end":
        capture.end = call;
        break;
      case "result":
        capture.result = call;
        break;
      case "answer":
        break;
    }
  }
  // Saved with the raw data: it records how the question set was selected.
  if (capture.filter) capture.calls.unshift(capture.filter);
  return capture;
}
