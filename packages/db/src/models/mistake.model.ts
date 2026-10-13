import mongoose from "mongoose";
import { DIFFICULTIES, SECTIONS, type Difficulty, type Section } from "@satsharks/types";

const { Schema } = mongoose;

// The mistake bank: one entry per question a student has answered wrong. It comes back (the retry
// queue) after 1, 3, 7 and 16 days (RETRY_INTERVAL_DAYS) until it is answered correctly; it then
// stays in the bank as fixed, and reopens if the student gets it wrong again later.
export interface MistakeDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  section: Section;
  topic: string | null;
  skill: string | null;
  difficulty: Difficulty | null;
  wrongCount: number;
  firstWrongAt: Date;
  lastWrongAt: Date;
  // Index into RETRY_INTERVAL_DAYS for the wait now running.
  step: number;
  // When it is due again; null once fixed.
  dueAt: Date | null;
  fixedAt: Date | null;
  // Where it was last met, to open the review.
  attemptId: mongoose.Types.ObjectId;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const mistakeSchema = new Schema<MistakeDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    section: { type: String, enum: SECTIONS, required: true },
    topic: { type: String, default: null },
    skill: { type: String, default: null },
    difficulty: { type: String, enum: [...DIFFICULTIES, null], default: null },
    // Counted with $inc on every wrong answer, the first included.
    wrongCount: { type: Number, default: 0 },
    firstWrongAt: { type: Date, required: true },
    lastWrongAt: { type: Date, required: true },
    step: { type: Number, default: 0 },
    dueAt: { type: Date, default: null },
    fixedAt: { type: Date, default: null },
    attemptId: { type: Schema.Types.ObjectId, ref: "Attempt", required: true },
    position: { type: Number, required: true },
  },
  { timestamps: true },
);

mistakeSchema.index({ userId: 1, questionId: 1 }, { unique: true });
mistakeSchema.index({ userId: 1, fixedAt: 1, dueAt: 1 });
mistakeSchema.index({ userId: 1, lastWrongAt: -1 });

export const MistakeModel =
  (mongoose.models.Mistake as mongoose.Model<MistakeDoc> | undefined) ?? mongoose.model<MistakeDoc>("Mistake", mistakeSchema);
