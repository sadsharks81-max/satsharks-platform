// Decides whether a student's answer is correct.
//
// Student-produced responses follow the Digital SAT entry rules: a fraction or its decimal
// equivalent is accepted, and a decimal that does not fit in the answer box may be truncated or
// rounded at the last digit that fits (5 characters for a positive answer, 6 for a negative one).
import type { QuestionType } from "@satsharks/types";

interface Answerable {
  questionType: QuestionType;
  correctAnswer?: { choiceKey: string | null; acceptedValues: string[] } | null;
}

function parseNumber(raw: string): number | null {
  const text = raw.trim().replace(/^\$+|\$+$/g, "").replace(/\s+/g, "");
  const fraction = /^(-?\d*\.?\d+)\/(\d*\.?\d+)$/.exec(text);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }
  return /^-?(\d+\.?\d*|\.\d+)$/.test(text) ? Number(text) : null;
}

function numbersMatch(studentText: string, accepted: number): boolean {
  const student = parseNumber(studentText);
  if (student === null) return false;
  if (Math.abs(student - accepted) < 1e-9) return true;

  // Truncated or rounded decimal: only valid when the student used every character available.
  const text = studentText.trim();
  const decimals = text.includes(".") && !text.includes("/") ? text.split(".")[1]!.length : 0;
  const boxIsFull = text.length >= (text.startsWith("-") ? 6 : 5);
  if (decimals === 0 || !boxIsFull) return false;
  const scale = 10 ** decimals;
  const truncated = Math.trunc(accepted * scale + (accepted < 0 ? -1e-9 : 1e-9)) / scale;
  const rounded = Math.round(accepted * scale) / scale;
  return Math.abs(student - truncated) < 1e-9 || Math.abs(student - rounded) < 1e-9;
}

// null = the question has no answer key, so it cannot be graded.
export function gradeAnswer(question: Answerable, answer: string | null): boolean | null {
  const key = question.correctAnswer;
  if (!key) return null;
  if (answer === null || answer.trim() === "") return false;

  if (question.questionType === "mcq") return answer === key.choiceKey;

  const normalized = answer.trim().toLowerCase();
  return key.acceptedValues.some((value) => {
    if (value.trim().toLowerCase() === normalized) return true;
    const accepted = parseNumber(value);
    return accepted !== null && numbersMatch(answer, accepted);
  });
}
