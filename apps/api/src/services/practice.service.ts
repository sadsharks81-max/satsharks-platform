// Practice drills and adaptive mocks.
//
// Drill: a student picks a question set from one exam and works through it, with an optional
// answer check per question.
// Adaptive mock: one section in two modules. Module 1 is built when the mock starts; Module 2 is
// built only after Module 1 is submitted, harder or easier depending on the Module 1 score.
//
// Answer keys never leave the server until a drill question is checked or the attempt ends.
// Module 2's questions do not exist anywhere the student can reach until Module 1 is closed.
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
  MOCK_FORMAT,
  SECTION_LABELS,
  SECTIONS,
  type AttemptNavItem,
  type AttemptQuestion,
  type AttemptSummary,
  type CatalogExam,
  type CatalogTopic,
  type MockModule,
  type PracticeCatalog,
  type ReviewQuestion,
  type Section,
} from "@satsharks/types";
import type { CreateAttemptInput, CreateMockInput, SaveAnswerInput } from "@satsharks/validation";
import mongoose from "mongoose";
import { AppError } from "../utils/app-error";
import { gradeAnswer } from "../utils/grading";
import { orderModule, pickModule, requiredForHard, type Candidate } from "./mock-assembly";
import { settingsService } from "./settings.service";

const MAX_QUESTIONS_PER_ATTEMPT = 200;
const CATALOG_TTL_MS = 60_000;

let catalogCache: { value: PracticeCatalog; expires: number } | null = null;

export function invalidateCatalog(): void {
  catalogCache = null;
}

type Item = AttemptDoc["items"][number];

// ---------- module bookkeeping (mocks) ----------

const moduleOneCount = (attempt: AttemptDoc) => attempt.items.filter((item) => item.module === "m1").length;

// Positions (1-based) of the module the student is working in.
function currentRange(attempt: AttemptDoc): { start: number; count: number } {
  if (attempt.kind !== "mock") return { start: 1, count: attempt.items.length };
  const m1 = moduleOneCount(attempt);
  return attempt.currentModule === "m2" ? { start: m1 + 1, count: attempt.items.length - m1 } : { start: 1, count: m1 };
}

const inCurrentModule = (attempt: AttemptDoc, position: number) => {
  const { start, count } = currentRange(attempt);
  return position >= start && position < start + count;
};

function timeRemaining(attempt: AttemptDoc): number | null {
  if (!attempt.timed || attempt.timeLimitSeconds === null) return null;
  if (attempt.status === "done") return 0;
  const elapsed = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
  return Math.max(0, attempt.timeLimitSeconds - elapsed);
}

function toSummary(attempt: AttemptDoc, paperTitle: string): AttemptSummary {
  const range = currentRange(attempt);
  const m1Total = moduleOneCount(attempt);
  return {
    id: String(attempt._id),
    kind: attempt.kind,
    name: attempt.name,
    section: attempt.section,
    paperTitle,
    mock:
      attempt.kind === "mock"
        ? {
            currentModule: attempt.currentModule,
            m2Type: attempt.m2Type,
            moduleStart: range.start,
            moduleQuestionCount: range.count,
            m1Correct: attempt.m1Correct,
            m2Correct: attempt.m2Correct,
            m1Total,
            m2Total: attempt.items.length - m1Total,
            routingRequiredCorrect: attempt.routingRequiredCorrect,
          }
        : null,
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

// While a mock is running, only the current module is listed; Module 1 is closed once submitted.
function toNavigation(attempt: AttemptDoc): AttemptNavItem[] {
  const all = attempt.items.map((item, index) => ({
    position: index + 1,
    answered: item.answer !== null,
    flagged: item.flagged,
    checked: item.checked,
  }));
  if (attempt.kind !== "mock" || attempt.status === "done") return all;
  return all.filter((entry) => inCurrentModule(attempt, entry.position));
}

function toQuestionView(question: QuestionDoc, item: Item, position: number, reveal: boolean): AttemptQuestion {
  return {
    position,
    module: item.module ?? null,
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

async function attemptTitle(attempt: AttemptDoc): Promise<string> {
  if (attempt.kind === "mock") {
    if (attempt.paperIds.length === 0) return `All exams — ${SECTION_LABELS[attempt.section]}`;
    const papers = await PaperModel.find({ _id: trusted({ $in: attempt.paperIds }) }).select("title").lean<PaperDoc[]>();
    const first = papers[0]?.title.split(" — ")[0] ?? "Selected exams";
    return papers.length > 1 ? `${first} + ${papers.length - 1} more` : first;
  }
  const paper = attempt.paperId ? await PaperModel.findById(attempt.paperId).select("title").lean<PaperDoc>() : null;
  return paper?.title ?? "";
}

async function gradeItems(items: Item[]): Promise<Item[]> {
  const questions = await QuestionModel.find({ _id: trusted({ $in: items.map((item) => item.questionId) }) })
    .select("+correctAnswer questionType")
    .lean<QuestionDoc[]>();
  const byId = new Map(questions.map((question) => [String(question._id), question]));
  return items.map((item) => {
    const question = byId.get(String(item.questionId));
    return { ...item, correct: item.answer === null || !question ? null : gradeAnswer(question, item.answer) };
  });
}

// Grades every item and closes the attempt. Idempotent.
async function finalize(attempt: AttemptDoc): Promise<AttemptDoc> {
  if (attempt.status === "done") return attempt;
  const items = await gradeItems(attempt.items);
  const correct = items.filter((item) => item.correct === true).length;
  const unanswered = items.filter((item) => item.answer === null).length;
  const set: Record<string, unknown> = {
    items,
    correct,
    incorrect: items.length - correct - unanswered,
    unanswered,
    status: "done",
    completedAt: new Date(),
  };
  if (attempt.kind === "mock") {
    set.m1Correct = items.filter((item) => item.module === "m1" && item.correct === true).length;
    set.m2Correct = items.filter((item) => item.module !== "m1" && item.correct === true).length;
  }
  const updated = await AttemptModel.findOneAndUpdate({ _id: attempt._id, status: "active" }, { $set: set }, { new: true }).lean<AttemptDoc>();
  // Another request finished it first: return that result.
  return updated ?? (await AttemptModel.findById(attempt._id).lean<AttemptDoc>())!;
}

// The questions a mock draws from: published, in the section, from the chosen exams (or all).
async function mockPool(section: Section, paperIds: mongoose.Types.ObjectId[]): Promise<Candidate[]> {
  // Aggregation pipelines are not passed through the query sanitizer; values here are ObjectIds
  // from validated input and fixed strings.
  const match: Record<string, unknown> = { status: "published", section };
  if (paperIds.length > 0) match.paperId = { $in: paperIds };
  const rows = await QuestionModel.aggregate<{ _id: mongoose.Types.ObjectId; skill: string | null; topic: string | null; difficulty: Candidate["difficulty"] }>([
    { $match: match },
    { $project: { _id: 1, skill: 1, topic: 1, difficulty: 1 } },
  ]);
  return rows.map((row) => ({ id: String(row._id), skill: row.skill, topic: row.topic, difficulty: row.difficulty }));
}

// Closes Module 1: grades it, applies the routing rule, builds Module 2 and restarts the clock.
// Safe to call twice: only the first call changes anything.
async function submitModuleOne(attempt: AttemptDoc): Promise<AttemptDoc> {
  if (attempt.kind !== "mock" || attempt.status !== "active" || attempt.currentModule !== "m1") return attempt;

  const graded = await gradeItems(attempt.items);
  const moduleOne = graded.filter((item) => item.module === "m1");
  const m1Correct = moduleOne.filter((item) => item.correct === true).length;
  const { routingThresholdPercent } = await settingsService.getAdaptive();
  const required = requiredForHard(moduleOne.length, routingThresholdPercent);
  const m2Type: MockModule = m1Correct >= required ? "m2_hard" : "m2_easy";

  const pool = await mockPool(attempt.section, attempt.paperIds);
  const format = MOCK_FORMAT[attempt.section];
  const used = new Set(moduleOne.map((item) => String(item.questionId)));
  const moduleTwo = orderModule(pickModule(pool, format.questionsPerModule, m2Type, used), attempt.section);

  const updated = await AttemptModel.findOneAndUpdate(
    { _id: attempt._id, status: "active", currentModule: "m1" },
    {
      $set: {
        items: [
          ...graded,
          ...moduleTwo.map((candidate) => ({ questionId: new mongoose.Types.ObjectId(candidate.id), module: m2Type })),
        ],
        currentModule: "m2",
        m2Type,
        m1Correct,
        routingThresholdPercent,
        routingRequiredCorrect: required,
        startedAt: new Date(),
        lastPosition: moduleOne.length + 1,
      },
    },
    { new: true },
  ).lean<AttemptDoc>();
  return updated ?? (await AttemptModel.findById(attempt._id).lean<AttemptDoc>())!;
}

// Loads an attempt the user owns. When a timed attempt's clock has run out it moves on here, so
// time cannot be extended by not calling "end": a mock's Module 1 is submitted (and Module 2's
// clock starts), anything else is finished.
async function loadAttempt(userId: string, attemptId: string): Promise<AttemptDoc> {
  let attempt = await AttemptModel.findOne({ _id: attemptId, userId }).lean<AttemptDoc>();
  if (!attempt) throw AppError.notFound("Attempt not found");
  if (attempt.status === "active" && timeRemaining(attempt) === 0) {
    attempt = attempt.kind === "mock" && attempt.currentModule === "m1" ? await submitModuleOne(attempt) : await finalize(attempt);
  }
  return attempt;
}

function itemAt(attempt: AttemptDoc, position: number): Item {
  const item = attempt.items[position - 1];
  if (!item) throw AppError.notFound("Question not found in this attempt");
  // A submitted mock module cannot be reopened while the mock is running.
  if (attempt.kind === "mock" && attempt.status === "active" && !inCurrentModule(attempt, position)) {
    throw AppError.conflict("That question belongs to a module that is already submitted");
  }
  return item;
}

async function summary(attempt: AttemptDoc): Promise<AttemptSummary> {
  return toSummary(attempt, await attemptTitle(attempt));
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
      kind: "drill",
      name: input.name || `${paper.title.split(" — ")[0]} practice`,
      section,
      paperId: paper._id,
      timed: input.timed,
      timeLimitSeconds: input.timed ? (input.timeMinutes ?? 30) * 60 : null,
      items: picked.map((row) => ({ questionId: row._id })),
    });
    return toSummary(attempt.toObject(), paper.title);
  },

  // Starts an adaptive mock: builds Module 1 now. Module 2 is built when Module 1 is submitted.
  async createMock(userId: string, input: CreateMockInput): Promise<AttemptSummary> {
    const paperIds = [...new Set(input.paperIds)].map((id) => new mongoose.Types.ObjectId(id));
    if (paperIds.length > 0) {
      const usable = await PaperModel.countDocuments({ _id: trusted({ $in: paperIds }), status: "published", sections: input.section });
      if (usable !== paperIds.length) throw AppError.badRequest(`Some selected exams are not available for ${SECTION_LABELS[input.section]}`);
    }

    const format = MOCK_FORMAT[input.section];
    const pool = await mockPool(input.section, paperIds);
    // Both modules must be full, and Module 2 never repeats a Module 1 question.
    if (pool.length < format.questionsPerModule * 2) {
      throw AppError.badRequest(
        `A ${SECTION_LABELS[input.section]} mock needs ${format.questionsPerModule * 2} questions; the selected exams have ${pool.length}. Choose more exams.`,
      );
    }
    const moduleOne = orderModule(pickModule(pool, format.questionsPerModule, "m1", new Set()), input.section);

    const attempt = await AttemptModel.create({
      userId,
      kind: "mock",
      name: input.name || `Adaptive ${SECTION_LABELS[input.section]} mock`,
      section: input.section,
      paperId: null,
      paperIds,
      timed: input.timed,
      timeLimitSeconds: input.timed ? format.minutesPerModule * 60 : null,
      currentModule: "m1",
      items: moduleOne.map((candidate) => ({ questionId: new mongoose.Types.ObjectId(candidate.id), module: "m1" })),
    });
    return summary(attempt.toObject());
  },

  async listAttempts(userId: string): Promise<AttemptSummary[]> {
    const attempts = await AttemptModel.find({ userId }).sort({ createdAt: -1 }).limit(100).lean<AttemptDoc[]>();
    return Promise.all(attempts.map(summary));
  },

  async getAttempt(userId: string, attemptId: string): Promise<{ attempt: AttemptSummary; navigation: AttemptNavItem[] }> {
    const attempt = await loadAttempt(userId, attemptId);
    return { attempt: await summary(attempt), navigation: toNavigation(attempt) };
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
    // The module guard repeats the check in the write itself, so a save racing a module
    // submission cannot land in a closed module.
    const filter: Record<string, unknown> = { _id: attempt._id, status: "active" };
    if (attempt.kind === "mock") filter.currentModule = attempt.currentModule;
    const result = await AttemptModel.updateOne(filter, { $set: set });
    if (result.matchedCount === 0) throw AppError.conflict("This module has already been submitted");

    const answer = input.answer !== undefined ? (input.answer === "" ? null : input.answer) : item.answer;
    return { position, answered: answer !== null, flagged: input.flagged ?? item.flagged, checked: item.checked };
  },

  // Reveals the answer to one drill question. The question is locked afterwards.
  async checkQuestion(userId: string, attemptId: string, position: number): Promise<AttemptQuestion> {
    const attempt = await loadAttempt(userId, attemptId);
    if (attempt.kind === "mock") throw AppError.badRequest("Answers in a mock are shown after it is finished");
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

  // Mock only: submits Module 1 and starts Module 2.
  async submitModule(userId: string, attemptId: string): Promise<{ attempt: AttemptSummary; navigation: AttemptNavItem[] }> {
    const loaded = await loadAttempt(userId, attemptId);
    if (loaded.kind !== "mock") throw AppError.badRequest("Only an adaptive mock has modules");
    if (loaded.status !== "active") throw AppError.conflict("This mock has ended");
    if (loaded.currentModule !== "m1") throw AppError.conflict("Module 1 has already been submitted");
    const attempt = await submitModuleOne(loaded);
    return { attempt: await summary(attempt), navigation: toNavigation(attempt) };
  },

  async endAttempt(userId: string, attemptId: string): Promise<AttemptSummary> {
    return summary(await finalize(await loadAttempt(userId, attemptId)));
  },

  async getResult(userId: string, attemptId: string): Promise<{ attempt: AttemptSummary; questions: ReviewQuestion[] }> {
    const attempt = await loadAttempt(userId, attemptId);
    if (attempt.status !== "done") throw AppError.conflict("Results are available after the attempt is submitted");

    const questions = await QuestionModel.find({ _id: trusted({ $in: attempt.items.map((item) => item.questionId) }) })
      .select("+correctAnswer +explanation")
      .lean<QuestionDoc[]>();
    const byId = new Map(questions.map((question) => [String(question._id), question]));

    const review: ReviewQuestion[] = [];
    attempt.items.forEach((item, index) => {
      const question = byId.get(String(item.questionId));
      if (!question) return;
      const view = toQuestionView(question, item, index + 1, true);
      review.push({ ...view, result: view.result!, topic: question.topic, skill: question.skill, difficulty: question.difficulty });
    });
    return { attempt: await summary(attempt), questions: review };
  },
};
