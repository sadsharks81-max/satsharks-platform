// Records what a student answered, for good (QuestionLogModel), and everything that follows from it:
// practice points (with the anti-cheating rules and daily cap), the day's goal progress, the streak
// and the mistake bank.
//
// Called when a drill question is checked and when an attempt ends. Logging the same question of
// the same attempt twice is harmless (unique index; only new entries count).
import {
  DailyStatModel,
  MistakeModel,
  QuestionLogModel,
  QuestionModel,
  UserModel,
  trusted,
  type AttemptDoc,
  type MistakeDoc,
  type QuestionDoc,
  type QuestionLogDoc,
  type UserDoc,
} from "@satsharks/db";
import type { AttemptOrigin } from "@satsharks/types";
import { createLogger, toErrorMessage } from "@satsharks/utils";
import mongoose from "mongoose";
import { gradeAnswer } from "../utils/grading";
import { afterCorrect, afterWrong, applyDailyCap, dayIn, isoWeek, isRushed, onGoalMet, pointsFor } from "./engagement-rules";
import { engagementService, freezesPerMonth, streakOf, timeZoneOf } from "./engagement.service";

const logger = createLogger("activity");

type Item = AttemptDoc["items"][number];

export const originOf = (attempt: Pick<AttemptDoc, "kind" | "origin">): AttemptOrigin => attempt.origin ?? (attempt.kind === "mock" ? "mock" : "exam");

// Blanks are only kept for tests (they count against the score); an unanswered drill question was
// simply not done.
function shouldLog(attempt: AttemptDoc, item: Item): boolean {
  return item.answer !== null || attempt.kind === "mock";
}

function blankTimedOut(attempt: AttemptDoc, item: Item): boolean {
  if (!attempt.timed) return false;
  return item.module === "m1" ? attempt.m1TimedOut === true : attempt.timedOut === true;
}

// The student gave the right answer at some point, then ended on a wrong one.
function changedFromCorrect(question: QuestionDoc, item: Item, correct: boolean | null): boolean {
  if (correct !== false) return false;
  return (item.answers ?? []).some((answer) => answer !== item.answer && gradeAnswer(question, answer) === true);
}

export const activityService = {
  // `positions` (1-based) limits the log to some questions (a drill check); default: all of them.
  async recordAttempt(attempt: AttemptDoc, items: Item[], positions?: number[], now = new Date()): Promise<void> {
    try {
      await record(attempt, items, positions, now);
    } catch (error) {
      // History must never break finishing a test; a missed entry is logged for investigation.
      logger.error("Could not record activity", { attemptId: String(attempt._id), error: toErrorMessage(error) });
    }
  },
};

async function record(attempt: AttemptDoc, items: Item[], positions: number[] | undefined, now: Date): Promise<void> {
  const wanted = (positions ?? items.map((_, index) => index + 1)).filter((position) => {
    const item = items[position - 1];
    return item && shouldLog(attempt, item);
  });
  if (wanted.length === 0) return;

  const user = await UserModel.findById(attempt.userId).lean<UserDoc>();
  if (!user) return;
  const timeZone = timeZoneOf(user);
  const day = dayIn(now, timeZone);

  const questions = await QuestionModel.find({ _id: trusted({ $in: wanted.map((position) => items[position - 1]!.questionId) }) })
    .select("+correctAnswer section topic skill difficulty questionType")
    .lean<QuestionDoc[]>();
  const byId = new Map(questions.map((question) => [String(question._id), question]));

  // Points: the rushed-set rule looks at every answer of the attempt so far, not just this batch.
  const answeredSoFar = items.filter((item) => item.answer !== null).map((item) => ({ section: attempt.section, seconds: item.timeSpentSeconds ?? 0 }));
  const rushed = isRushed(answeredSoFar);
  const today = await DailyStatModel.findOne({ userId: attempt.userId, day }).lean();

  const entries: Omit<QuestionLogDoc, "_id" | "createdAt">[] = [];
  for (const position of wanted) {
    const item = items[position - 1]!;
    const question = byId.get(String(item.questionId));
    if (!question) continue;
    const correct = item.answer === null ? null : (item.correct ?? gradeAnswer(question, item.answer));
    entries.push({
      userId: attempt.userId,
      questionId: item.questionId,
      attemptId: attempt._id,
      position,
      attemptName: attempt.name,
      origin: originOf(attempt),
      fullTestId: attempt.fullTestId ?? null,
      section: question.section,
      topic: question.topic ?? null,
      skill: question.skill ?? null,
      difficulty: question.difficulty ?? null,
      answer: item.answer,
      correct,
      timeSpentSeconds: item.timeSpentSeconds ?? 0,
      changedFromCorrect: changedFromCorrect(question, item, correct),
      timedOut: item.answer === null && blankTimedOut(attempt, item),
      points: rushed ? 0 : pointsFor({ section: question.section, correct, seconds: item.timeSpentSeconds ?? 0, difficulty: question.difficulty ?? null }),
      day,
      answeredAt: now,
    });
  }
  const capped = applyDailyCap(
    entries.map((entry) => entry.points),
    today?.points ?? 0,
  );
  entries.forEach((entry, index) => (entry.points = capped[index]!));

  // Insert only what is not logged yet; upsertedIds tells which ones are new.
  let upserted: Record<number, unknown> = {};
  try {
    const result = await QuestionLogModel.bulkWrite(
      entries.map((entry) => ({
        updateOne: { filter: { attemptId: entry.attemptId, position: entry.position }, update: { $setOnInsert: entry }, upsert: true },
      })),
      { ordered: false },
    );
    upserted = result.upsertedIds as Record<number, unknown>;
  } catch (error) {
    // Two requests logging the same question at once: the unique index keeps one; the rest went in.
    const result = (error as { result?: { upsertedIds?: Record<number, unknown> } }).result;
    if ((error as { code?: unknown }).code !== 11000 && !result) throw error;
    upserted = result?.upsertedIds ?? {};
  }
  const fresh = Object.keys(upserted).map((index) => entries[Number(index)]!);
  if (fresh.length === 0) return;

  const answered = fresh.filter((entry) => entry.answer !== null);
  const points = fresh.reduce((sum, entry) => sum + entry.points, 0);
  const stat = await DailyStatModel.findOneAndUpdate(
    { userId: attempt.userId, day },
    {
      $setOnInsert: { week: isoWeek(day), goalMet: false },
      $inc: {
        questions: answered.length,
        correct: answered.filter((entry) => entry.correct === true).length,
        seconds: answered.reduce((sum, entry) => sum + entry.timeSpentSeconds, 0),
        points,
      },
    },
    { upsert: true, new: true },
  ).lean();
  if (points > 0) await UserModel.updateOne({ _id: attempt.userId }, { $inc: { totalPoints: points } });

  await updateMistakes(attempt.userId, fresh, now);

  // Goal reached for the first time today: the streak grows.
  const goal = await engagementService.goalFor(user, now);
  const progress = goal.type === "questions" ? stat!.questions : Math.floor(stat!.seconds / 60);
  if (!stat!.goalMet && progress >= goal.amount) {
    const claimed = await DailyStatModel.updateOne({ _id: stat!._id, goalMet: false }, { $set: { goalMet: true } });
    if (claimed.modifiedCount === 1) {
      const { state } = onGoalMet(streakOf(user), day, freezesPerMonth(user), now);
      await UserModel.updateOne({ _id: attempt.userId }, { $set: { streak: state } });
    }
  }
}

// Wrong answers go into the mistake bank (or come back later); right answers fix open mistakes.
async function updateMistakes(userId: mongoose.Types.ObjectId, entries: Omit<QuestionLogDoc, "_id" | "createdAt">[], now: Date): Promise<void> {
  const graded = entries.filter((entry) => entry.correct !== null);
  if (graded.length === 0) return;
  const existing = await MistakeModel.find({ userId, questionId: trusted({ $in: graded.map((entry) => entry.questionId) }) }).lean<MistakeDoc[]>();
  const byQuestion = new Map(existing.map((mistake) => [String(mistake.questionId), mistake]));
  const ops: mongoose.AnyBulkWriteOperation<MistakeDoc>[] = [];
  for (const entry of graded) {
    const mistake = byQuestion.get(String(entry.questionId));
    if (entry.correct === false) {
      const next = afterWrong(mistake ?? null, now);
      ops.push({
        updateOne: {
          filter: { userId, questionId: entry.questionId },
          update: {
            $set: {
              ...next,
              section: entry.section,
              topic: entry.topic,
              skill: entry.skill,
              difficulty: entry.difficulty,
              lastWrongAt: now,
              attemptId: entry.attemptId,
              position: entry.position,
            },
            $inc: { wrongCount: 1 },
            $setOnInsert: { firstWrongAt: now },
          },
          upsert: true,
        },
      });
    } else if (mistake && !mistake.fixedAt) {
      ops.push({ updateOne: { filter: { _id: mistake._id }, update: { $set: afterCorrect(mistake, now) } } });
    }
  }
  // wrongCount starts at 0 on insert so the $inc makes the first one 1.
  if (ops.length > 0) await MistakeModel.bulkWrite(ops, { ordered: false });
}
