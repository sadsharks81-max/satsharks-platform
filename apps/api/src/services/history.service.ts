// Test history, question history and the mistake bank (proposal 3.1). Everything a student has
// done is kept: attempts removed from their lists still appear here.
import { AttemptModel, FullTestModel, MistakeModel, QuestionLogModel, QuestionModel, trusted, type AttemptDoc, type FullTestDoc, type MistakeDoc, type QuestionDoc, type QuestionLogDoc } from "@satsharks/db";
import {
  FREE_ANALYTICS,
  RETRY_INTERVAL_DAYS,
  SECTIONS,
  type MistakeBank,
  type MistakeItem,
  type QuestionHistoryPage,
  type QuestionResultKind,
  type Section,
  type TestHistoryEntry,
} from "@satsharks/types";
import type { MistakeQuery, QuestionHistoryQuery } from "@satsharks/validation";
import mongoose from "mongoose";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The question's prompt, for a short preview (the web shows two lines of it).
async function prompts(ids: mongoose.Types.ObjectId[]): Promise<Map<string, string>> {
  const questions = await QuestionModel.find({ _id: trusted({ $in: ids }) }).select("prompt").lean<QuestionDoc[]>();
  return new Map(questions.map((question) => [String(question._id), question.prompt.slice(0, 600)]));
}

const resultOf = (correct: boolean | null): QuestionResultKind => (correct === null ? "skipped" : correct ? "correct" : "wrong");

export const historyService = {
  // Finished full tests and section mocks, newest first, each with the change since the previous
  // one of its kind (full test to full test, Math to Math, Reading and Writing to Reading and Writing).
  async tests(userId: string): Promise<TestHistoryEntry[]> {
    const [fullTests, mocks] = await Promise.all([
      FullTestModel.find({ userId, completedAt: trusted({ $ne: null }) }).lean<FullTestDoc[]>(),
      AttemptModel.find({ userId, kind: "mock", status: "done" }).select("name section sectionScore correct items.questionId fullTestId completedAt removedAt").lean<AttemptDoc[]>(),
    ]);
    const sectionsOf = new Map<string, AttemptDoc[]>();
    for (const mock of mocks) {
      if (!mock.fullTestId) continue;
      const list = sectionsOf.get(String(mock.fullTestId)) ?? [];
      list.push(mock);
      sectionsOf.set(String(mock.fullTestId), list);
    }
    const entries: TestHistoryEntry[] = [
      ...fullTests.map((test): TestHistoryEntry => {
        const parts = sectionsOf.get(String(test._id)) ?? [];
        return {
          kind: "full_test",
          id: String(test._id),
          href: `/full-tests/${test._id}`,
          name: test.name,
          section: null,
          score: test.totalScore ?? null,
          change: null,
          correct: parts.reduce((sum, part) => sum + part.correct, 0),
          total: parts.reduce((sum, part) => sum + part.items.length, 0),
          completedAt: test.completedAt!.toISOString(),
          removed: !!test.removedAt,
        };
      }),
      ...mocks
        .filter((mock) => !mock.fullTestId && mock.completedAt)
        .map(
          (mock): TestHistoryEntry => ({
            kind: "section",
            id: String(mock._id),
            href: `/practice/${mock._id}/results`,
            name: mock.name,
            section: mock.section,
            score: mock.sectionScore ?? null,
            change: null,
            correct: mock.correct,
            total: mock.items.length,
            completedAt: mock.completedAt!.toISOString(),
            removed: !!mock.removedAt,
          }),
        ),
    ].sort((a, b) => a.completedAt.localeCompare(b.completedAt));

    const previous = new Map<string, number>();
    for (const entry of entries) {
      const key = entry.kind === "full_test" ? "full" : entry.section!;
      const before = previous.get(key);
      if (entry.score !== null) {
        if (before !== undefined) entry.change = entry.score - before;
        previous.set(key, entry.score);
      }
    }
    return entries.reverse();
  },

  async questions(userId: string, query: QuestionHistoryQuery): Promise<QuestionHistoryPage> {
    const filter: Record<string, unknown> = { userId };
    if (query.result === "correct") filter.correct = true;
    if (query.result === "wrong") filter.correct = false;
    if (query.result === "skipped") filter.correct = null;
    if (query.section) filter.section = query.section;
    if (query.topic) filter.topic = new RegExp(`^${escapeRegex(query.topic)}$`);
    if (query.difficulty) filter.difficulty = query.difficulty;
    if (query.from || query.to) {
      const range: Record<string, string> = {};
      if (query.from) range.$gte = query.from;
      if (query.to) range.$lte = query.to;
      filter.day = trusted(range);
    }
    const [logs, total] = await Promise.all([
      QuestionLogModel.find(filter)
        .sort({ answeredAt: -1, position: 1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean<QuestionLogDoc[]>(),
      QuestionLogModel.countDocuments(filter),
    ]);
    const previews = await prompts(logs.map((log) => log.questionId));
    return {
      items: logs.map((log) => ({
        id: String(log._id),
        attemptId: String(log.attemptId),
        position: log.position,
        attemptName: log.attemptName,
        origin: log.origin,
        section: log.section,
        topic: log.topic,
        skill: log.skill,
        difficulty: log.difficulty,
        preview: previews.get(String(log.questionId)) ?? "",
        result: resultOf(log.correct),
        timeSpentSeconds: log.timeSpentSeconds,
        answeredAt: log.answeredAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  },

  // `full` false (analytics kept for paid plans): only the newest mistakes are shown and retried.
  async mistakes(userId: string, query: MistakeQuery, full: boolean, now = new Date()): Promise<MistakeBank> {
    const all = await MistakeModel.find({ userId }).sort({ lastWrongAt: -1 }).limit(full ? 2000 : FREE_ANALYTICS.mistakes).lean<MistakeDoc[]>();
    const statusOf = (mistake: MistakeDoc): MistakeItem["status"] => (mistake.fixedAt ? "fixed" : mistake.dueAt && mistake.dueAt <= now ? "due" : "waiting");
    const dueBySection = Object.fromEntries(SECTIONS.map((section) => [section, 0])) as Record<Section, number>;
    let open = 0;
    let fixed = 0;
    for (const mistake of all) {
      const status = statusOf(mistake);
      if (status === "fixed") fixed += 1;
      else open += 1;
      if (status === "due") dueBySection[mistake.section] += 1;
    }
    const shown = all.filter((mistake) => {
      const status = statusOf(mistake);
      if (query.section && mistake.section !== query.section) return false;
      if (query.status === "fixed") return status === "fixed";
      if (query.status === "due") return status === "due";
      if (query.status === "open") return status !== "fixed";
      return true;
    });
    const page = shown.slice(0, 200);
    const previews = await prompts(page.map((mistake) => mistake.questionId));
    return {
      items: page.map((mistake) => ({
        id: String(mistake._id),
        section: mistake.section,
        topic: mistake.topic,
        skill: mistake.skill,
        difficulty: mistake.difficulty,
        preview: previews.get(String(mistake.questionId)) ?? "",
        wrongCount: mistake.wrongCount,
        lastWrongAt: mistake.lastWrongAt.toISOString(),
        status: statusOf(mistake),
        dueAt: mistake.fixedAt || !mistake.dueAt ? null : mistake.dueAt.toISOString(),
        step: Math.min(mistake.step, RETRY_INTERVAL_DAYS.length - 1) + 1,
        fixedAt: mistake.fixedAt ? mistake.fixedAt.toISOString() : null,
        attemptId: String(mistake.attemptId),
        position: mistake.position,
      })),
      counts: { open, due: Object.values(dueBySection).reduce((sum, n) => sum + n, 0), fixed, dueBySection },
      limited: !full,
      limit: full ? null : FREE_ANALYTICS.mistakes,
    };
  },

  // The due mistakes of one section to retry now, oldest due first.
  async dueQuestionIds(userId: string, section: Section, count: number, full: boolean, now = new Date()): Promise<mongoose.Types.ObjectId[]> {
    const pool = await MistakeModel.find({ userId }).sort({ lastWrongAt: -1 }).limit(full ? 2000 : FREE_ANALYTICS.mistakes).lean<MistakeDoc[]>();
    const due = pool
      .filter((mistake) => mistake.section === section && !mistake.fixedAt && mistake.dueAt && mistake.dueAt <= now)
      .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime());
    // Only questions still published can be practised.
    const live = await QuestionModel.find({ _id: trusted({ $in: due.map((mistake) => mistake.questionId) }), status: "published" }).select("_id").lean<QuestionDoc[]>();
    const ok = new Set(live.map((question) => String(question._id)));
    return due.filter((mistake) => ok.has(String(mistake.questionId))).slice(0, count).map((mistake) => mistake.questionId);
  },
};
