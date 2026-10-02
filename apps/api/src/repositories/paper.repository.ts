import { PaperModel, QuestionModel, type PaperDoc, type QuestionDoc } from "../models";

export const paperRepository = {
  list(): Promise<PaperDoc[]> {
    return PaperModel.find().sort({ createdAt: -1 }).lean<PaperDoc[]>().exec();
  },

  findById(id: string): Promise<PaperDoc | null> {
    return PaperModel.findById(id).lean<PaperDoc>().exec();
  },

  // Admin view, so the answer is included to show whether one was imported.
  listQuestions(paperId: string): Promise<QuestionDoc[]> {
    return QuestionModel.find({ paperId })
      .select("+correctAnswer")
      .sort({ section: 1, moduleNumber: 1, questionNumber: 1 })
      // A preview: the full, filterable list is the admin question bank.
      .limit(50)
      .lean<QuestionDoc[]>()
      .exec();
  },
};
