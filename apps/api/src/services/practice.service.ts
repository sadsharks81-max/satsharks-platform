// Practice drills: a student picks a question set from published content and works through it.
// Answer keys never leave the server until the student checks a question or ends the attempt.
import {
  AttemptModel,
  PaperModel,
  QuestionModel,
  trusted,
  type AttemptDoc,
  type PaperDoc,
  type QuestionDoc,
} from "@satsharks/db";
import {
  SECTIONS,
  type AttemptNavItem,
  type AttemptQuestion,
  type AttemptSummary,
  type CatalogExam,
  type CatalogTopic,
  type PracticeCatalog,
  type ReviewQuestion,
  type Section,
} from "@satsharks/types";
import type { CreateAttemptInput, SaveAnswerInput } from "@satsharks/validation";
import mongoose from "mongoose";
import { AppError } from "../utils/app-error";
import { gradeAnswer } from "../utils/grading";

const MAX_QUESTIONS_PER_ATTEMPT = 200;
const CATALOG_TTL_MS = 60_000;

let catalogCache: { value: PracticeCatalog; expires: number } | null = null;

export function invalidateCatalog(): void {
  catalogCache = null;
}

function timeRemaining(attempt: AttemptDoc): number | null {
  if (!attempt.timed || attempt.timeLimitSeconds === null) return null;
  if (attempt.status === "done") return 0;
  const elapsed = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
  return Math.max(0, attempt.timeLimitSeconds - elapsed);
}

function toSummary(attempt: AttemptDoc, paperTitle: string): AttemptSummary {
  return {
    id: String(attempt._id),
    name: attempt.name,
    section: attempt.section,
    paperTitle,
    status: attempt.status,
    timed: attempt.timed,
    timeLimitSeconds: attempt.timeLimitSeconds,
    timeRemainingSeconds: timeRemaining(attempt),
    lastPosition: attempt.lastPosition,
    total: attempt.items.length,
    answered: attempt.items.filter((item) => item.answer !== null).length,
    correct: attempt.correct,
    incorrect: attempt.incorrect,
    unanswered: attempt.unanswered,
    createdAt: attempt.createdAt.toISOString(),
    completedAt: attempt.completedAt ? attempt.completedAt.toISOString() : null,
  };
}

const toNavigation = (attempt: AttemptDoc): AttemptNavItem[] =>
  attempt.items.map((item, index) => ({
    position: index + 1,
    answered: item.answer !== null,
    flagged: item.flagged,
    checked: item.checked,
  }));

function toQuestionView(
  question: QuestionDoc,
  item: AttemptDoc["items"][number],
  position: number,
  reveal: boolean,
): AttemptQuestion {
  return {
    position,
    section: question.section,
    questionType: question.questionType,
    prompt: question.prompt,
    passage: question.passage,
    choices: question.choices.map((choice) => ({ key: choice.key, text: choice.text, viz: choice.viz ?? null })),
    assets: question.assets.map((asset) => ({ kind: asset.kind, url: asset.url, maxWidth: asset.maxWidth })),
    viz: question.viz ?? null,
    answer: item.answer,
    flagged: item.flagged,
    checked: item.checked,
    result: reveal
      ? { correct: item.correct, correctAnswer: question.correctAnswer ?? null, explanation: question.explanation ?? null }
      : null,
  };
}

async function paperTitles(ids: mongoose.Types.ObjectId[]): Promise<Map<string, string>> {
  const papers = await PaperModel.find({ _id: trusted({ $in: ids }) }).select("title").lean<PaperDoc[]>();
  return new Map(papers.map((paper) => [String(paper._id), paper.title]));
}

// Grades every item and closes the attempt. Idempotent.
async function finalize(attempt: AttemptDoc): Promise<AttemptDoc> {
  if (attempt.status === "done") return attempt;
  const questions = await QuestionModel.find({ _id: trusted({ $in: attempt.items.map((item) => item.questionId) }) })
    .select("+correctAnswer questionType")
    .lean<QuestionDoc[]>();
  const byId = new Map(questions.map((question) => [String(question._id), question]));

  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  const items = attempt.items.map((item) => {
    const question = byId.get(String(item.questionId));
    const result = question ? gradeAnswer(question, item.answer) : null;
    if (item.answer === null) unanswered++;
    else if (result) correct++;
    else incorrect++;
    return { ...item, correct: item.answer === null ? null : result };
  });

  const updated = await AttemptModel.findOneAndUpdate(
    { _id: attempt._id, status: "active" },
    { $set: { items, correct, incorrect, unanswered, status: "done", completedAt: new Date() } },
    { new: true },
  ).lean<AttemptDoc>();
  // Another request finished it first: return that result.
  return updated ?? (await AttemptModel.findById(attempt._id).lean<AttemptDoc>())!;
}

// Loads an attempt the user owns. A timed attempt whose clock has run out is ended here, so
// time cannot be extended by simply not calling "end".
async function loadAttempt(userId: string, attemptId: string): Promise<AttemptDoc> {
  const attempt = await AttemptModel.findOne({ _id: attemptId, userId }).lean<AttemptDoc>();
  if (!attempt) throw AppError.notFound("Attempt not found");
  if (attempt.status === "active" && timeRemaining(attempt) === 0) return finalize(attempt);
  return attempt;
}

function itemAt(attempt: AttemptDoc, position: number) {
  const item = attempt.items[position - 1];
  if (!item) throw AppError.notFound("Question not found in this attempt");
  return item;
}

export const practiceService = {
  // What a student can practise: published papers grouped by exam, and the topic/skill vocabulary.
  async catalog(): Promise<PracticeCatalog> {
    if (catalogCache && catalogCache.expires > Date.now()) return catalogCache.value;

    const papers = await PaperModel.find({ status: "published" }).lean<PaperDoc[]>();
    const exams = new Map<string, CatalogExam>();
    for (const paper of papers) {
      const meta = paper.sourceMetadata ?? {};
      // Papers from the same exam (one per section) are shown as one card.
      const examId = meta.examId != null ? String(meta.examId) : String(paper._id);
      const exam = exams.get(examId) ?? {
        examId,
        name: typeof meta.examName === "string" ? meta.examName : paper.title,
        examDate: typeof meta.examDate === "string" ? meta.examDate : null,
        sections: {},
      };
      for (const section of paper.sections) {
        exam.sections[section] = { paperId: String(paper._id), questionCount: paper.questionCount };
      }
      exams.set(examId, exam);
    }

    const rows = await QuestionModel.aggregate<{ _id: { section: Section; topic: string | null; skill: string | null } }>([
      { $match: { status: "published" } },
      { $group: { _id: { section: "$section", topic: "$topic", skill: "$skill" } } },
    ]);
    const topics = Object.fromEntries(SECTIONS.map((section) => [section, [] as CatalogTopic[]])) as Record<Section, CatalogTopic[]>;
    for (const { _id } of rows) {
      if (!_id.topic) continue;
      let topic = topics[_id.section].find((entry) => entry.topic === _id.topic);
      if (!topic) topics[_id.section].push((topic = { topic: _id.topic, skills: [] }));
      if (_id.skill && !topic.skills.includes(_id.skill)) topic.skills.push(_id.skill);
    }
    for (const section of SECTIONS) {
      topics[section].sort((a, b) => a.topic.localeCompare(b.topic));
      for (const topic of topics[section]) topic.skills.sort((a, b) => a.localeCompare(b));
    }

    const value: PracticeCatalog = {
      exams: [...exams.values()].sort((a, b) => (b.examDate ?? "").localeCompare(a.examDate ?? "")),
      topics,
    };
    catalogCache = { value, expires: Date.now() + CATALOG_TTL_MS };
    return value;
  },

  async createAttempt(userId: string, input: CreateAttemptInput): Promise<AttemptSummary> {
    const paper = await PaperModel.findOne({ _id: input.paperId, status: "published" }).lean<PaperDoc>();
    if (!paper) throw AppError.notFound("That exam is not available");
    const section = paper.sections[0];
    if (!section) throw AppError.badRequest("That exam has no questions");

    // Aggregation pipelines are not passed through the query sanitizer, so operators are written
    // plainly here. Every value comes from the validated input (strings) or from the database.
    const match: Record<string, unknown> = { paperId: paper._id, status: "published" };
    if (input.topics.length > 0) match.topic = { $in: input.topics };
    if (input.skills.length > 0) match.skill = { $in: input.skills };
    if (input.difficulty) match.difficulty = input.difficulty;

    if (input.excludeAnswered) {
      const answered = await AttemptModel.aggregate<{ _id: mongoose.Types.ObjectId }>([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $unwind: "$items" },
        { $match: { "items.answer": { $ne: null } } },
        { $group: { _id: "$items.questionId" } },
      ]);
      if (answered.length > 0) match._id = { $nin: answered.map((row) => row._id) };
    }

    const size = Math.min(input.limit ?? MAX_QUESTIONS_PER_ATTEMPT, MAX_QUESTIONS_PER_ATTEMPT);
    const picked = await QuestionModel.aggregate<{ _id: mongoose.Types.ObjectId }>([
      { $match: match },
      { $sample: { size } },
      { $project: { _id: 1 } },
    ]);
    if (picked.length === 0) throw AppError.badRequest("No questions match those filters");

    const attempt = await AttemptModel.create({
      userId,
      name: input.name || `${paper.title.split(" — ")[0]} practice`,
      section,
      paperId: paper._id,
      timed: input.timed,
      timeLimitSeconds: input.timed ? (input.timeMinutes ?? 30) * 60 : null,
      items: picked.map((row) => ({ questionId: row._id })),
    });
    return toSummary(attempt.toObject(), paper.title);
  },

  async listAttempts(userId: string): Promise<AttemptSummary[]> {
    const attempts = await AttemptModel.find({ userId }).sort({ createdAt: -1 }).limit(100).lean<AttemptDoc[]>();
    const titles = await paperTitles(attempts.map((attempt) => attempt.paperId));
    return attempts.map((attempt) => toSummary(attempt, titles.get(String(attempt.paperId)) ?? ""));
  },

  async getAttempt(userId: string, attemptId: string): Promise<{ attempt: AttemptSummary; navigation: AttemptNavItem[] }> {
    const attempt = await loadAttempt(userId, attemptId);
    const titles = await paperTitles([attempt.paperId]);
    return { attempt: toSummary(attempt, titles.get(String(attempt.paperId)) ?? ""), navigation: toNavigation(attempt) };
  },

  async getQuestion(userId: string, attemptId: string, position: number): Promise<AttemptQuestion> {
    const attempt = await loadAttempt(userId, attemptId);
    const item = itemAt(attempt, position);
    const reveal = item.checked || attempt.status === "done";
    const query = QuestionModel.findById(item.questionId);
    if (reveal) query.select("+correctAnswer +explanation");
    const question = await query.lean<QuestionDoc>();
    if (!question) throw AppError.notFound("This question is no longer available");

    if (attempt.status === "active" && attempt.lastPosition !== position) {
      await AttemptModel.updateOne({ _id: attempt._id, status: "active" }, { $set: { lastPosition: position } });
    }
    return toQuestionView(question, item, position, reveal);
  },

  async saveAnswer(userId: string, attemptId: string, position: number, input: SaveAnswerInput): Promise<AttemptNavItem> {
    const attempt = await loadAttempt(userId, attemptId);
    if (attempt.status !== "active") throw AppError.conflict("This attempt has ended");
    const item = itemAt(attempt, position);
    // Once the answer has been revealed it can no longer be changed.
    if (item.checked && input.answer !== undefined) throw AppError.conflict("This question has already been checked");

    const index = position - 1;
    const set: Record<string, unknown> = { lastPosition: position };
    if (input.answer !== undefined) set[`items.${index}.answer`] = input.answer === "" ? null : input.answer;
    if (input.flagged !== undefined) set[`items.${index}.flagged`] = input.flagged;
    await AttemptModel.updateOne({ _id: attempt._id, status: "active" }, { $set: set });

    const answer = input.answer !== undefined ? (input.answer === "" ? null : input.answer) : item.answer;
    return { position, answered: answer !== null, flagged: input.flagged ?? item.flagged, checked: item.checked };
  },

  // Reveals the answer to one question. The question is locked afterwards.
  async checkQuestion(userId: string, attemptId: string, position: number): Promise<AttemptQuestion> {
    const attempt = await loadAttempt(userId, attemptId);
    if (attempt.status !== "active") throw AppError.conflict("This attempt has ended");
    const item = itemAt(attempt, position);
    if (item.answer === null) throw AppError.badRequest("Answer the question before checking it");

    const question = await QuestionModel.findById(item.questionId).select("+correctAnswer +explanation").lean<QuestionDoc>();
    if (!question) throw AppError.notFound("This question is no longer available");
    const correct = gradeAnswer(question, item.answer);
    const index = position - 1;
    await AttemptModel.updateOne(
      { _id: attempt._id, status: "active" },
      { $set: { [`items.${index}.checked`]: true, [`items.${index}.correct`]: correct } },
    );
    return toQuestionView(question, { ...item, checked: true, correct }, position, true);
  },

  async endAttempt(userId: string, attemptId: string): Promise<AttemptSummary> {
    const attempt = await finalize(await loadAttempt(userId, attemptId));
    const titles = await paperTitles([attempt.paperId]);
    return toSummary(attempt, titles.get(String(attempt.paperId)) ?? "");
  },

  async getResult(userId: string, attemptId: string): Promise<{ attempt: AttemptSummary; questions: ReviewQuestion[] }> {
    const attempt = await loadAttempt(userId, attemptId);
    if (attempt.status !== "done") throw AppError.conflict("Results are available after the attempt is submitted");

    const questions = await QuestionModel.find({ _id: trusted({ $in: attempt.items.map((item) => item.questionId) }) })
      .select("+correctAnswer +explanation")
      .lean<QuestionDoc[]>();
    const byId = new Map(questions.map((question) => [String(question._id), question]));
    const titles = await paperTitles([attempt.paperId]);

    const review: ReviewQuestion[] = [];
    attempt.items.forEach((item, index) => {
      const question = byId.get(String(item.questionId));
      if (!question) return;
      const view = toQuestionView(question, item, index + 1, true);
      review.push({ ...view, result: view.result!, topic: question.topic, skill: question.skill, difficulty: question.difficulty });
    });
    return { attempt: toSummary(attempt, titles.get(String(attempt.paperId)) ?? ""), questions: review };
  },
};
