import mongoose from "mongoose";
import { ATTEMPT_STATUSES, SECTIONS, type AttemptStatus, type Section } from "@satsharks/types";

const { Schema } = mongoose;

export interface AttemptItem {
  questionId: mongoose.Types.ObjectId;
  // What the student entered: a choice key ("A") or the typed response. null = unanswered.
  answer: string | null;
  flagged: boolean;
  // The student used "Check" on this question, so its answer has already been revealed.
  checked: boolean;
  // Filled in when the question is checked or the attempt ends.
  correct: boolean | null;
}

export interface AttemptDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  kind: "drill";
  name: string;
  section: Section;
  paperId: mongoose.Types.ObjectId;
  status: AttemptStatus;
  timed: boolean;
  timeLimitSeconds: number | null;
  // Authoritative clock for timed attempts: remaining = limit - (now - startedAt), computed on the server.
  startedAt: Date;
  lastPosition: number;
  items: AttemptItem[];
  correct: number;
  incorrect: number;
  unanswered: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<AttemptItem>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    answer: { type: String, default: null, maxlength: 200 },
    flagged: { type: Boolean, default: false },
    checked: { type: Boolean, default: false },
    correct: { type: Boolean, default: null },
  },
  { _id: false },
);

const attemptSchema = new Schema<AttemptDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["drill"], default: "drill" },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    section: { type: String, enum: SECTIONS, required: true },
    paperId: { type: Schema.Types.ObjectId, ref: "Paper", required: true },
    status: { type: String, enum: ATTEMPT_STATUSES, default: "active" },
    timed: { type: Boolean, default: false },
    timeLimitSeconds: { type: Number, default: null },
    startedAt: { type: Date, default: () => new Date() },
    lastPosition: { type: Number, default: 1 },
    items: { type: [itemSchema], default: [] },
    correct: { type: Number, default: 0 },
    incorrect: { type: Number, default: 0 },
    unanswered: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// A student's attempts, newest first, optionally by status.
attemptSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const AttemptModel =
  (mongoose.models.Attempt as mongoose.Model<AttemptDoc> | undefined) ??
  mongoose.model<AttemptDoc>("Attempt", attemptSchema);
