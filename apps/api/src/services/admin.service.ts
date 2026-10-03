import { AttemptModel, PaperModel, ProblemReportModel, QuestionModel, trusted, UserModel, type PaperDoc, type QuestionDoc } from "@satsharks/db";
import {
  PAPER_STATUSES,
  SECTIONS,
  type AdminQuestion,
  type AdminStats,
  type CatalogTopic,
  type PaperStatus,
  type Section,
  type UserRegion,
} from "@satsharks/types";
import type { QuestionListQuery, UpdateQuestionInput } from "@satsharks/validation";
import { AppError } from "../utils/app-error";
import { invalidateCatalog } from "./practice.service";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function toAdminQuestion(question: QuestionDoc, paperTitle: string | null): AdminQuestion {
  return {
    id: String(question._id),
    paperId: String(question.paperId),
    paperTitle,
    sourceQuestionId: question.sourceQuestionId,
    section: question.section,
    questionNumber: question.questionNumber,
    questionType: question.questionType,
    difficulty: question.difficulty,
    topic: question.topic,
    skill: question.skill,
    status: question.status,
    prompt: question.prompt,
    passage: question.passage,
    choices: question.choices.map((choice) => ({ key: choice.key, text: choice.text, viz: choice.viz ?? null })),
    assets: question.assets.map((asset) => ({ kind: asset.kind, url: asset.url, maxWidth: asset.maxWidth })),
    viz: question.viz ?? null,
    correctAnswer: question.correctAnswer ?? null,
    explanation: question.explanation ?? null,
  };
}

async function countBy<T extends string>(model: typeof PaperModel | typeof QuestionModel, field: string, keys: readonly T[]) {
  const rows = await (model as typeof QuestionModel).aggregate<{ _id: T; n: number }>([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }]);
  const result = Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
  for (const row of rows) if (row._id in result) result[row._id] = row.n;
  return result;
}

export const adminService = {
  async stats(): Promise<AdminStats> {
    const [users, regions, papers, questions, questionsBySection, attempts, pendingReports, resolvedReports] = await Promise.all([
      UserModel.estimatedDocumentCount(),
      UserModel.aggregate<{ _id: UserRegion | null; n: number }>([{ $group: { _id: "$region", n: { $sum: 1 } } }]),
      countBy(PaperModel, "status", PAPER_STATUSES),
      countBy(QuestionModel, "status", PAPER_STATUSES),
      countBy(QuestionModel, "section", SECTIONS),
      AttemptModel.estimatedDocumentCount(),
      ProblemReportModel.countDocuments({ status: "pending" }),
      ProblemReportModel.countDocuments({ status: "resolved" }),
    ]);
    const usersByRegion: AdminStats["usersByRegion"] = { local: 0, international: 0, unknown: 0 };
    for (const row of regions) usersByRegion[row._id ?? "unknown"] += row.n;
    return { users, usersByRegion, reports: { pending: pendingReports, resolved: resolvedReports }, papers, questions, questionsBySection, attempts };
  },

  // A paper's questions always share its status: students only ever query published questions.
  async setPaperStatus(status: PaperStatus, ids?: string[]): Promise<{ papers: number; questions: number }> {
    const paperFilter = ids ? { _id: trusted({ $in: ids }) } : {};
    const questionFilter = ids ? { paperId: trusted({ $in: ids }) } : {};
    const papers = await PaperModel.updateMany(paperFilter, { $set: { status } });
    if (ids && papers.matchedCount === 0) throw AppError.notFound("Paper not found");
    const questions = await QuestionModel.updateMany(questionFilter, { $set: { status } });
    invalidateCatalog();
    return { papers: papers.matchedCount, questions: questions.matchedCount };
  },

  // Topic and skill values present in the bank, for the filter dropdowns.
  async facets(): Promise<Record<Section, CatalogTopic[]>> {
    const rows = await QuestionModel.aggregate<{ _id: { section: Section; topic: string | null; skill: string | null } }>([
      { $group: { _id: { section: "$section", topic: "$topic", skill: "$skill" } } },
    ]);
    const facets = Object.fromEntries(SECTIONS.map((section) => [section, [] as CatalogTopic[]])) as Record<Section, CatalogTopic[]>;
    for (const { _id } of rows) {
      if (!_id.topic) continue;
      let topic = facets[_id.section].find((entry) => entry.topic === _id.topic);
      if (!topic) facets[_id.section].push((topic = { topic: _id.topic, skills: [] }));
      if (_id.skill && !topic.skills.includes(_id.skill)) topic.skills.push(_id.skill);
    }
    for (const section of SECTIONS) {
      facets[section].sort((a, b) => a.topic.localeCompare(b.topic));
      for (const topic of facets[section]) topic.skills.sort((a, b) => a.localeCompare(b));
    }
    return facets;
  },

  async listQuestions(query: QuestionListQuery): Promise<{ questions: AdminQuestion[]; total: number; page: number; pageSize: number }> {
    const filter: Record<string, unknown> = {};
    if (query.section) filter.section = query.section;
    if (query.status) filter.status = query.status;
    if (query.topic) filter.topic = query.topic;
    if (query.skill) filter.skill = query.skill;
    if (query.paperId) filter.paperId = query.paperId;
    if (query.difficulty) filter.difficulty = query.difficulty === "none" ? null : query.difficulty;
    if (query.search) {
      const pattern = new RegExp(escapeRegex(query.search), "i");
      // Searches the question text, the passage and the source ID.
      filter.$or = trusted([{ prompt: pattern }, { passage: pattern }, { sourceQuestionId: query.search }]);
    }

    const [total, questions] = await Promise.all([
      QuestionModel.countDocuments(filter),
      QuestionModel.find(filter)
        .select("+correctAnswer +explanation")
        .sort({ paperId: 1, questionNumber: 1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean<QuestionDoc[]>(),
    ]);
    const papers = await PaperModel.find({ _id: trusted({ $in: [...new Set(questions.map((q) => String(q.paperId)))] }) })
      .select("title")
      .lean<PaperDoc[]>();
    const titles = new Map(papers.map((paper) => [String(paper._id), paper.title]));
    return {
      questions: questions.map((question) => toAdminQuestion(question, titles.get(String(question.paperId)) ?? null)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  },

  async getQuestion(id: string): Promise<AdminQuestion> {
    const question = await QuestionModel.findById(id).select("+correctAnswer +explanation").lean<QuestionDoc>();
    if (!question) throw AppError.notFound("Question not found");
    const paper = await PaperModel.findById(question.paperId).select("title").lean<PaperDoc>();
    return toAdminQuestion(question, paper?.title ?? null);
  },

  async updateQuestion(id: string, input: UpdateQuestionInput): Promise<AdminQuestion> {
    const question = await QuestionModel.findById(id).select("+correctAnswer").lean<QuestionDoc>();
    if (!question) throw AppError.notFound("Question not found");

    const key = input.correctAnswer;
    if (key && question.questionType === "mcq" && !question.choices.some((choice) => choice.key === key.choiceKey)) {
      throw AppError.badRequest("The correct answer must be one of the question's choices");
    }
    if (key && question.questionType !== "mcq" && key.acceptedValues.length === 0) {
      throw AppError.badRequest("Enter at least one accepted answer");
    }

    await QuestionModel.updateOne({ _id: id }, { $set: input });
    invalidateCatalog();
    return this.getQuestion(id);
  },

  async deleteQuestion(id: string): Promise<void> {
    const question = await QuestionModel.findByIdAndDelete(id).lean<QuestionDoc>();
    if (!question) throw AppError.notFound("Question not found");
    // Keep the paper's counts true.
    const remaining = await QuestionModel.countDocuments({ paperId: question.paperId, moduleType: question.moduleType });
    await PaperModel.updateOne(
      { _id: question.paperId },
      { $inc: { questionCount: -1 }, $set: { "modules.$[module].questionCount": remaining } },
      { arrayFilters: [{ "module.moduleType": question.moduleType, "module.section": question.section }] },
    );
    invalidateCatalog();
  },
};
