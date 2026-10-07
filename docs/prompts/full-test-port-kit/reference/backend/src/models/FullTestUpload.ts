import mongoose, { Schema, Document } from "mongoose";
import {
  FULL_TEST_DIFFICULTIES,
  FULL_TEST_MODULE_SLOTS,
  FULL_TEST_QUESTION_TYPES,
  type FullTestModuleSlot,
  type FullTestQuestionType,
} from "../utils/full-test-parser";

export interface IFullTestUploadQuestion {
  moduleSlot: FullTestModuleSlot;
  questionNumber: number;
  questionType: FullTestQuestionType;
  text: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  category: string;
  difficulty: string;
}

/**
 * One section (Reading & Writing or Math) of a full test. The PDF is parsed
 * while it is uploaded and only the extracted questions are kept, so nothing
 * depends on the uploads folder, which Railway wipes on every deploy.
 */
export interface IFullTestUploadSection {
  fileName: string;
  fileSize: number;
  status: "EXTRACTED" | "REVIEWED" | "FAILED";
  errorMessage: string;
  warnings: string[];
  questions: IFullTestUploadQuestion[];
  uploadedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: mongoose.Types.ObjectId | null;
}

export interface IFullTestUpload extends Document {
  title: string;
  year: number;
  testNumber: number;
  status: "DRAFT" | "PUBLISHED";
  readingWriting: IFullTestUploadSection | null;
  math: IFullTestUploadSection | null;
  publishedTest: mongoose.Types.ObjectId | null;
  publishedAt: Date | null;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FullTestUploadQuestionSchema = new Schema(
  {
    moduleSlot: { type: String, enum: FULL_TEST_MODULE_SLOTS, required: true },
    questionNumber: { type: Number, required: true },
    questionType: { type: String, enum: FULL_TEST_QUESTION_TYPES, default: "MULTIPLE_CHOICE" },
    text: { type: String, default: "" },
    options: [{ label: String, text: String, _id: false }],
    correctAnswer: { type: String, default: "" },
    explanation: { type: String, default: "" },
    category: { type: String, default: "" },
    difficulty: { type: String, enum: FULL_TEST_DIFFICULTIES, default: "MEDIUM" },
  },
  { _id: false },
);

const FullTestUploadSectionSchema = new Schema(
  {
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    status: { type: String, enum: ["EXTRACTED", "REVIEWED", "FAILED"], required: true },
    errorMessage: { type: String, default: "" },
    warnings: { type: [String], default: [] },
    questions: { type: [FullTestUploadQuestionSchema], default: [] },
    uploadedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false },
);

const FullTestUploadSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    testNumber: { type: Number, required: true },
    status: { type: String, enum: ["DRAFT", "PUBLISHED"], default: "DRAFT" },
    readingWriting: { type: FullTestUploadSectionSchema, default: null },
    math: { type: FullTestUploadSectionSchema, default: null },
    publishedTest: { type: Schema.Types.ObjectId, ref: "SATTest", default: null },
    publishedAt: { type: Date, default: null },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

FullTestUploadSchema.index({ createdAt: -1 });

export default mongoose.model<IFullTestUpload>("FullTestUpload", FullTestUploadSchema);
