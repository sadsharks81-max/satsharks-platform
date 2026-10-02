// Parses Bluecorn's attempt objects. Field names are the source's; nothing here knows about our schema.
import { isRecord, nonEmptyString } from "@satsharks/utils";
import type { AttemptCapture, AttemptKind } from "./discovery";

export interface SourceAttempt {
  id: string;
  kind: AttemptKind;
  name: string | null;
  section: string | null;
  status: string | null;
  // Total questions in the attempt, as reported by the source.
  count: number | null;
  currentModule: string | null;
  m2Type: string | null;
  m1Correct: number | null;
  m2Correct: number | null;
  timed: boolean | null;
  timeLimitSeconds: number | null;
  examIds: string[];
  examNames: string[];
  // Drill only: how the question set was selected. Empty arrays / null mean "no filter".
  filter: { domains: string[]; skills: string[]; difficulty: string | null; limit: number | null } | null;
}

const numberOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const stringArray = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

function attemptObjects(capture: AttemptCapture): Record<string, unknown>[] {
  const objects: Record<string, unknown>[] = [];
  for (const call of [...capture.attemptSnapshots, capture.endModule1, capture.end, capture.result]) {
    if (!call || !isRecord(call.response)) continue;
    // The attempt and result calls wrap it as { attempt }; the end calls return the fields directly.
    objects.push(isRecord(call.response.attempt) ? call.response.attempt : call.response);
  }
  return objects;
}

// Later calls win: m2_type and the correct counts only exist after the modules are submitted.
export function parseAttempt(capture: AttemptCapture): SourceAttempt {
  const merged: Record<string, unknown> = {};
  for (const object of attemptObjects(capture)) {
    for (const [key, value] of Object.entries(object)) {
      if (value !== null && value !== undefined) merged[key] = value;
    }
  }

  const startRequest = isRecord(capture.start?.request) ? capture.start.request : {};
  const filterRequest = isRecord(capture.filter?.request) ? capture.filter.request : null;

  // A mock takes a list of exam sources, a drill takes exactly one.
  const examIds = Array.isArray(startRequest.p_exam_ids)
    ? startRequest.p_exam_ids.map(String)
    : startRequest.p_exam_id != null
      ? [String(startRequest.p_exam_id)]
      : [];

  const catalogue = isRecord(capture.metadata?.response) ? capture.metadata.response.exams : null;
  const examNames = Array.isArray(catalogue)
    ? catalogue
        .filter((exam): exam is Record<string, unknown> => isRecord(exam) && examIds.includes(String(exam.id)))
        .map((exam) => nonEmptyString(exam.name))
        .filter((name): name is string => name !== null)
    : [];

  return {
    id: capture.id,
    kind: capture.kind,
    name: nonEmptyString(merged.name),
    section:
      nonEmptyString(merged.section) ?? nonEmptyString(startRequest.p_section) ?? nonEmptyString(filterRequest?.p_section),
    status: nonEmptyString(merged.status),
    count: numberOrNull(merged.count),
    currentModule: nonEmptyString(merged.current_module),
    m2Type: nonEmptyString(merged.m2_type),
    m1Correct: numberOrNull(merged.m1_correct),
    m2Correct: numberOrNull(merged.m2_correct),
    timed: typeof merged.timer === "boolean" ? merged.timer : null,
    timeLimitSeconds: numberOrNull(merged.t_time),
    examIds,
    examNames,
    filter: filterRequest
      ? {
          domains: stringArray(filterRequest.p_domains),
          skills: stringArray(filterRequest.p_skills),
          difficulty: nonEmptyString(filterRequest.p_difficulty),
          limit: numberOrNull(filterRequest.p_limit),
        }
      : null,
  };
}
