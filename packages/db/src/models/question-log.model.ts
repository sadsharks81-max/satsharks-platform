import mongoose from "mongoose";
import { ATTEMPT_ORIGINS, DIFFICULTIES, SECTIONS, type AttemptOrigin, type Difficulty, type Section } from "@satsharks/types";

const { Schema } = mongoose;

// One question a student met in a drill or test, kept for good (proposal 3.1: "every question
// attempted is saved permanently"). Written when a drill question is checked and when an attempt
// ends; deleting the attempt from the student's lists never removes it. Question history, the
// mistake bank, analytics, points and streaks are all read from here.
export interface QuestionLogDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  attemptId: mongoose.Types.ObjectId;
  // 1-based position in the attempt (to open its review).
  position: number;
  attemptName: string;
  origin: AttemptOrigin;
  fullTestId: mongoose.Types.ObjectId | null;
  // Copied from the question when logged, so filters work without a join.
  section: Section;
  topic: string | null;
  skill: string | null;
  difficulty: Difficulty | null;
  answer: string | null;
  // null = left blank.
  correct: boolean | null;
  timeSpentSeconds: number;
  // The student had the right answer and changed it to a wrong one.
  changedFromCorrect: boolean;
  // Left blank when a timed module ran out.
  timedOut: boolean;
  // Points given for this answer (0 when too fast, rushed or over the daily cap).
  points: number;
  // YYYY-MM-DD in the student's time zone.
  day: string;
  answeredAt: Date;
  createdAt: Date;
}

const questionLogSchema = new Schema<QuestionLogDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    attemptId: { type: Schema.Types.ObjectId, ref: "Attempt", required: true },
    position: { type: Number, required: true },
    attemptName: { type: String, default: "" },
    origin: { type: String, enum: ATTEMPT_ORIGINS, required: true },
    fullTestId: { type: Schema.Types.ObjectId, ref: "FullTest", default: null },
    section: { type: String, enum: SECTIONS, required: true },
    topic: { type: String, default: null },
    skill: { type: String, default: null },
    difficulty: { type: String, enum: [...DIFFICULTIES, null], default: null },
    answer: { type: String, default: null },
    correct: { type: Boolean, default: null },
    timeSpentSeconds: { type: Number, default: 0 },
    changedFromCorrect: { type: Boolean, default: false },
    timedOut: { type: Boolean, default: false },
    points: { type: Number, default: 0 },
    day: { type: String, required: true },
    answeredAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One entry per question per attempt: logging twice (check, then end) never doubles it.
questionLogSchema.index({ attemptId: 1, position: 1 }, { unique: true });
// History, newest first, with filters.
questionLogSchema.index({ userId: 1, answeredAt: -1 });
questionLogSchema.index({ userId: 1, section: 1, answeredAt: -1 });
// Trap answers: what other students chose on the same question.
questionLogSchema.index({ questionId: 1, correct: 1 });

export const QuestionLogModel =
  (mongoose.models.QuestionLog as mongoose.Model<QuestionLogDoc> | undefined) ??
  mongoose.model<QuestionLogDoc>("QuestionLog", questionLogSchema);
