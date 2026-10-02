import mongoose from "mongoose";
import {
  MODULE_TYPES,
  PAPER_STATUSES,
  SECTIONS,
  type PaperAdaptiveInfo,
  type PaperModule,
  type PaperStatus,
  type Section,
} from "@satsharks/types";

const { Schema } = mongoose;

export interface PaperDoc {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string | null;
  // Where the paper came from ("bluecorn", later "pdf-upload", ...) and its ID there.
  source: string;
  sourcePaperId: string;
  status: PaperStatus;
  sections: Section[];
  modules: PaperModule[];
  adaptive: PaperAdaptiveInfo;
  questionCount: number;
  metadata: Record<string, unknown>;
  sourceMetadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const moduleSchema = new Schema<PaperModule>(
  {
    key: { type: String, required: true },
    section: { type: String, enum: SECTIONS, required: true },
    moduleNumber: { type: Number, enum: [1, 2, null], default: null },
    moduleType: { type: String, enum: MODULE_TYPES, required: true },
    questionCount: { type: Number, required: true, min: 0 },
    timeLimitSeconds: { type: Number, default: null },
  },
  { _id: false },
);

const adaptiveSchema = new Schema<PaperAdaptiveInfo>(
  {
    isAdaptive: { type: Boolean, default: false },
    routing: { type: String, enum: ["server_side", "client_side", "unknown"], default: "unknown" },
    observedRoute: { type: String, enum: [...MODULE_TYPES, null], default: null },
    module1Correct: { type: Number, default: null },
    routingThreshold: { type: Number, default: null },
  },
  { _id: false },
);

const paperSchema = new Schema<PaperDoc>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    source: { type: String, required: true },
    sourcePaperId: { type: String, required: true },
    // Imported papers are never published automatically.
    status: { type: String, enum: PAPER_STATUSES, default: "draft", index: true },
    sections: [{ type: String, enum: SECTIONS }],
    modules: { type: [moduleSchema], default: [] },
    adaptive: { type: adaptiveSchema, default: () => ({}) },
    questionCount: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    sourceMetadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false },
);

// One paper per source ID: makes the importer safe to re-run.
paperSchema.index({ source: 1, sourcePaperId: 1 }, { unique: true });

export const PaperModel =
  (mongoose.models.Paper as mongoose.Model<PaperDoc> | undefined) ?? mongoose.model<PaperDoc>("Paper", paperSchema);
