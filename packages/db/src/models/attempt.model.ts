import mongoose from "mongoose";
import {
  ATTEMPT_KINDS,
  ATTEMPT_STATUSES,
  SECTIONS,
  type AttemptKind,
  type AttemptStatus,
  type MockModule,
  type Section,
} from "@satsharks/types";

const { Schema } = mongoose;

export interface AttemptItem {
  questionId: mongoose.Types.ObjectId;
  // Adaptive mocks only: which module the question belongs to. null for drills.
  module: MockModule | null;
  // What the student entered: a choice key ("A") or the typed response. null = unanswered.
  answer: string | null;
  flagged: boolean;
  // The student used "Check" on this question, so its answer has already been revealed. Drills only.
  checked: boolean;
  // Filled in when the question is checked, when its module is submitted, or when the attempt ends.
  correct: boolean | null;
}

export interface AttemptDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  kind: AttemptKind;
  name: string;
  section: Section;
  // Drill: the one paper it was drawn from. Mock: null when drawn from every exam.
  paperId: mongoose.Types.ObjectId | null;
  // Mock: the exams its question pool was restricted to. Empty = every published exam.
  paperIds: mongoose.Types.ObjectId[];
  status: AttemptStatus;
  timed: boolean;
  // Drill: limit for the whole attempt. Mock: limit for each module.
  timeLimitSeconds: number | null;
  // Authoritative clock: remaining = limit - (now - start), computed on the server.
  // Drill: start of the attempt. Mock: start of the current module.
  startedAt: Date;
  lastPosition: number;
  items: AttemptItem[];

  // Adaptive mocks only.
  currentModule: "m1" | "m2" | null;
  m2Type: "m2_easy" | "m2_hard" | null;
  m1Correct: number | null;
  m2Correct: number | null;
  // The rule in force when Module 1 was submitted, kept with the attempt.
  routingThresholdPercent: number | null;
  routingRequiredCorrect: number | null;

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
    module: { type: String, enum: ["m1", "m2_easy", "m2_hard", null], default: null },
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
    kind: { type: String, enum: ATTEMPT_KINDS, default: "drill" },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    section: { type: String, enum: SECTIONS, required: true },
    paperId: { type: Schema.Types.ObjectId, ref: "Paper", default: null },
    paperIds: { type: [Schema.Types.ObjectId], ref: "Paper", default: [] },
    status: { type: String, enum: ATTEMPT_STATUSES, default: "active" },
    timed: { type: Boolean, default: false },
    timeLimitSeconds: { type: Number, default: null },
    startedAt: { type: Date, default: () => new Date() },
    lastPosition: { type: Number, default: 1 },
    items: { type: [itemSchema], default: [] },
    currentModule: { type: String, enum: ["m1", "m2", null], default: null },
    m2Type: { type: String, enum: ["m2_easy", "m2_hard", null], default: null },
    m1Correct: { type: Number, default: null },
    m2Correct: { type: Number, default: null },
    routingThresholdPercent: { type: Number, default: null },
    routingRequiredCorrect: { type: Number, default: null },
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
