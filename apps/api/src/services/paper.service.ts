import type { PaperSummary, QuestionListItem } from "@satsharks/types";
import type { PaperDoc, QuestionDoc } from "../models";
import { paperRepository } from "../repositories/paper.repository";
import { AppError } from "../utils/app-error";

function toPaperSummary(paper: PaperDoc): PaperSummary {
  return {
    id: String(paper._id),
    title: paper.title,
    description: paper.description,
    source: paper.source,
    sourcePaperId: paper.sourcePaperId,
    status: paper.status,
    sections: paper.sections,
    modules: paper.modules,
    adaptive: paper.adaptive,
    questionCount: paper.questionCount,
    createdAt: paper.createdAt.toISOString(),
    updatedAt: paper.updatedAt.toISOString(),
  };
}

function toQuestionListItem(question: QuestionDoc): QuestionListItem {
  return {
    id: String(question._id),
    section: question.section,
    moduleNumber: question.moduleNumber,
    moduleType: question.moduleType,
    questionNumber: question.questionNumber,
    questionType: question.questionType,
    difficulty: question.difficulty,
    topic: question.topic,
    skill: question.skill,
    prompt: question.prompt,
    hasCorrectAnswer: question.correctAnswer != null,
  };
}

export const paperService = {
  async list(): Promise<PaperSummary[]> {
    const examDate = (paper: PaperDoc) => String(paper.sourceMetadata?.examDate ?? "");
    return (await paperRepository.list())
      // Newest exam first; within an exam, Math before Reading & Writing.
      .sort((a, b) => examDate(b).localeCompare(examDate(a)) || String(a.sections[0]).localeCompare(String(b.sections[0])))
      .map(toPaperSummary);
  },

  async getWithQuestions(id: string): Promise<{ paper: PaperSummary; questions: QuestionListItem[] }> {
    const paper = await paperRepository.findById(id);
    if (!paper) throw AppError.notFound("Paper not found");
    const questions = await paperRepository.listQuestions(id);
    return { paper: toPaperSummary(paper), questions: questions.map(toQuestionListItem) };
  },
};
