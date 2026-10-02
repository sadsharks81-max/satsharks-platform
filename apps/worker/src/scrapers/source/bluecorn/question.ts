// Parses Bluecorn's question objects. These calls describe a question:
//   mGet / pGet              - what the student sees while testing (no answer)
//   mrGetResult / rpGetResult - the review page (adds the correct answer; module_type for mocks)
//   pCheckQuestion           - a single-question answer check in a drill (same shape as a result question)
import { isRecord, nonEmptyString } from "@satsharks/utils";
import type { AttemptCapture } from "./discovery";

export interface SourceQuestion {
  // Per-attempt question ID ("id" in mGet, "testId" in the navigation list).
  attemptQuestionId: string | null;
  // Stable ID of the question in the source's bank.
  contentId: string | null;
  section: string | null;
  position: number | null;
  type: string | null;
  prompt: string | null;
  passage: string | null;
  options: { text: string; viz: unknown }[];
  imageUrl: string | null;
  imageMaxWidth: number | null;
  viz: unknown;
  // "m1" | "m2_easy" | "m2_hard" when the result call was captured.
  moduleType: string | null;
  // True when this question was fetched after Module 1 was submitted. Null if only seen in results.
  seenAfterModule1End: boolean | null;
  correctIndex: number | null;
  correctValues: string[] | null;
  explanation: string | null;
  inResult: boolean;
}

const stringId = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : typeof value === "number" ? String(value) : null;

export function parseQuestion(raw: Record<string, unknown>): SourceQuestion {
  const options = Array.isArray(raw.options)
    ? raw.options.map((option) =>
        isRecord(option)
          ? { text: typeof option.text === "string" ? option.text : "", viz: option.viz_data ?? null }
          : { text: String(option ?? ""), viz: null },
      )
    : [];
  const dimensions = isRecord(raw.image_dimensions) ? raw.image_dimensions : {};

  return {
    attemptQuestionId: stringId(raw.id),
    contentId: stringId(raw.content_id),
    section: nonEmptyString(raw.section),
    position: typeof raw.position === "number" ? raw.position : null,
    // The test screen calls it q_type, the review screen calls it type.
    type: nonEmptyString(raw.q_type) ?? nonEmptyString(raw.type),
    prompt: nonEmptyString(raw.prompt),
    passage: nonEmptyString(raw.passage),
    options,
    imageUrl: nonEmptyString(raw.graph_url) ?? nonEmptyString(raw.image),
    imageMaxWidth: typeof dimensions.maxWidth === "number" ? dimensions.maxWidth : null,
    viz: raw.viz_data ?? null,
    moduleType: nonEmptyString(raw.module_type),
    seenAfterModule1End: null,
    correctIndex: typeof raw.c_answer === "number" && raw.c_answer >= 0 ? raw.c_answer : null,
    correctValues:
      Array.isArray(raw.c_answers) && raw.c_answers.length > 0 ? raw.c_answers.map((value) => String(value)) : null,
    explanation: nonEmptyString(raw.explanation),
    inResult: false,
  };
}

// Result fields win where present; anything the result omits is kept from the test-screen copy.
function merge(base: SourceQuestion, result: SourceQuestion): SourceQuestion {
  const merged = { ...base };
  for (const key of Object.keys(result) as (keyof SourceQuestion)[]) {
    const value = result[key];
    if (value === null || (Array.isArray(value) && value.length === 0)) continue;
    (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}

export function parseQuestions(capture: AttemptCapture): SourceQuestion[] {
  // The same question is fetched again whenever the student navigates back to it: keep the last copy.
  const seen = new Map<string, SourceQuestion>();
  for (const { call, afterModule1End } of capture.questionCalls) {
    if (!isRecord(call.response)) continue;
    const question = { ...parseQuestion(call.response), seenAfterModule1End: afterModule1End };
    const key = question.attemptQuestionId ?? question.contentId;
    if (key) seen.set(key, question);
  }

  // Answer checks first, the result payload last, so the final result wins if both describe a question.
  const resultQuestions = [
    ...capture.checkCalls.map((call) => call.response).filter(isRecord),
    ...(isRecord(capture.result?.response) && Array.isArray(capture.result.response.questions)
      ? capture.result.response.questions.filter(isRecord)
      : []),
  ];
  if (resultQuestions.length === 0) return [...seen.values()];

  const byContentId = new Map<string, string>();
  for (const [key, question] of seen) if (question.contentId) byContentId.set(question.contentId, key);

  for (const raw of resultQuestions) {
    const result = { ...parseQuestion(raw), inResult: true };
    const key =
      (result.attemptQuestionId && seen.has(result.attemptQuestionId) ? result.attemptQuestionId : null) ??
      (result.contentId ? byContentId.get(result.contentId) : undefined) ??
      result.attemptQuestionId ??
      result.contentId;
    if (!key) continue;
    const base = seen.get(key);
    seen.set(key, base ? merge(base, result) : result);
    if (result.contentId) byContentId.set(result.contentId, key);
  }
  // Questions fetched during the test but absent from the result payload stay: they just have no answer.
  return [...seen.values()];
}
