// The only place scaled scores are calculated. Results, stored attempts, full tests and anything
// later (dashboards, analytics) go through these functions.
//
// Method (proposal, Checkpoint 2.2): section scores 200–800 are read from a raw-to-scaled
// conversion table; the total 400–1600 is the sum of the two section scores. Because Module 2
// adapts, there is one table per section for each route (after the easier or the harder Module 2).
// Routes without an admin-entered table use the built-in estimate (DEFAULT_CONVERSION_TABLES).
import {
  SECTION_SCORE_MAX,
  SECTION_SCORE_MIN,
  sectionQuestionCount,
  type ConversionTables,
  type MockModule,
  type Section,
} from "@satsharks/types";

export function emptyConversionTables(): ConversionTables {
  return {
    reading_writing: { m2_easy: null, m2_hard: null },
    math: { m2_easy: null, m2_hard: null },
  };
}

// Section score for `rawCorrect` correct answers over both modules. null when the section was not
// finished through Module 2, or no usable table exists for its route. A section with a different
// number of questions (e.g. an uploaded test) is scored by its share correct.
export function sectionScore(
  tables: ConversionTables,
  section: Section,
  route: MockModule | null,
  rawCorrect: number,
  questionCount: number,
): number | null {
  if (route !== "m2_easy" && route !== "m2_hard") return null;
  if (questionCount <= 0) return null;
  const fullCount = sectionQuestionCount(section);
  const table = tables[section][route];
  if (!table || table.length !== fullCount + 1) return null;
  const raw = questionCount === fullCount ? rawCorrect : Math.round((rawCorrect / questionCount) * fullCount);
  const score = table[Math.max(0, Math.min(raw, fullCount))];
  if (score === undefined || score < SECTION_SCORE_MIN || score > SECTION_SCORE_MAX) return null;
  return score;
}

// 400–1600 once both sections have a score.
export function totalScore(readingWriting: number | null, math: number | null): number | null {
  return readingWriting === null || math === null ? null : readingWriting + math;
}
