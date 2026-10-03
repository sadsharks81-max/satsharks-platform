import mongoose from "mongoose";
import { ATTEMPT_KINDS, REPORT_REASONS, REPORT_STATUSES, SECTIONS, type AttemptKind, type ReportReason, type ReportStatus, type Section } from "@satsharks/types";

const { Schema } = mongoose;

export interface ReportEvent {
  action: "created" | "resolved" | "reopened";
  at: Date;
  by: mongoose.Types.ObjectId | null;
  note: string | null;
  questionEdited: boolean;
}

// A student's "Report a problem" on one question. Never deleted: resolving and reopening are
// appended to history, so what happened to a report stays visible.
export interface ProblemReportDoc {
  _id: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  paperId: mongoose.Types.ObjectId | null;
  section: Section;
  userId: mongoose.Types.ObjectId;
  // Where the student met the question.
  attemptId: mongoose.Types.ObjectId | null;
  attemptKind: AttemptKind | null;
  position: number | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  history: ReportEvent[];
  resolvedAt: Date | null;
  resolvedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<ReportEvent>(
  {
    action: { type: String, enum: ["created", "resolved", "reopened"], required: true },
    at: { type: Date, required: true },
    by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    note: { type: String, default: null, maxlength: 1000 },
    questionEdited: { type: Boolean, default: false },
  },
  { _id: false },
);

const problemReportSchema = new Schema<ProblemReportDoc>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    paperId: { type: Schema.Types.ObjectId, ref: "Paper", default: null },
    section: { type: String, enum: SECTIONS, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attemptId: { type: Schema.Types.ObjectId, ref: "Attempt", default: null },
    attemptKind: { type: String, enum: [...ATTEMPT_KINDS, null], default: null },
    position: { type: Number, default: null },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, default: null, maxlength: 1000 },
    status: { type: String, enum: REPORT_STATUSES, default: "pending" },
    history: { type: [eventSchema], default: [] },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// The admin queue: newest first within a status.
problemReportSchema.index({ status: 1, createdAt: -1 });
problemReportSchema.index({ questionId: 1, status: 1 });
// One pending report per student per question: a second click cannot file a duplicate.
problemReportSchema.index({ userId: 1, questionId: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });

export const ProblemReportModel =
  (mongoose.models.ProblemReport as mongoose.Model<ProblemReportDoc> | undefined) ??
  mongoose.model<ProblemReportDoc>("ProblemReport", problemReportSchema);
