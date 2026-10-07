import mongoose from "mongoose";
import { DIFFICULTIES, UPLOAD_SECTION_STATUSES, type UploadQuestion, type UploadSectionStatus } from "@satsharks/types";

const { Schema } = mongoose;

// A fixed adaptive practice test uploaded by an admin as two PDFs (Reading & Writing and Math, each
// with Module 1, Module 2 easier and Module 2 harder). The PDFs are read during the upload request
// and only the extracted questions are kept here: hosts such as Railway wipe local files on every
// deploy. Publishing turns the reviewed questions into two papers (one per section); after that
// this record is the test's home: its title, its number and whether students can see it.
export interface TestUploadSectionDoc {
  fileName: string;
  fileSize: number;
  status: UploadSectionStatus;
  errorMessage: string;
  warnings: string[];
  questions: UploadQuestion[];
  uploadedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: mongoose.Types.ObjectId | null;
}

export interface TestUploadDoc {
  _id: mongoose.Types.ObjectId;
  title: string;
  year: number;
  testNumber: number;
  status: "draft" | "published";
  active: boolean;
  readingWriting: TestUploadSectionDoc | null;
  math: TestUploadSectionDoc | null;
  paperIds: { reading_writing: mongoose.Types.ObjectId | null; math: mongoose.Types.ObjectId | null };
  publishedAt: Date | null;
  uploadedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<UploadQuestion>(
  {
    module: { type: String, enum: ["m1", "m2_easy", "m2_hard"], required: true },
    questionNumber: { type: Number, required: true },
    questionType: { type: String, enum: ["mcq", "spr"], required: true },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    topic: { type: String, default: "" },
    skill: { type: String, default: null },
    passage: { type: String, default: null },
    prompt: { type: String, default: "" },
    choices: { type: [{ key: String, text: String, _id: false }], default: [] },
    choiceKey: { type: String, default: null },
    acceptedValues: { type: [String], default: [] },
    explanation: { type: String, default: "" },
  },
  { _id: false },
);

const sectionSchema = new Schema<TestUploadSectionDoc>(
  {
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    status: { type: String, enum: UPLOAD_SECTION_STATUSES, required: true },
    errorMessage: { type: String, default: "" },
    warnings: { type: [String], default: [] },
    questions: { type: [questionSchema], default: [] },
    uploadedAt: { type: Date, default: () => new Date() },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false },
);

const testUploadSchema = new Schema<TestUploadDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    year: { type: Number, required: true },
    testNumber: { type: Number, required: true },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    active: { type: Boolean, default: false },
    readingWriting: { type: sectionSchema, default: null },
    math: { type: sectionSchema, default: null },
    paperIds: {
      reading_writing: { type: Schema.Types.ObjectId, ref: "Paper", default: null },
      math: { type: Schema.Types.ObjectId, ref: "Paper", default: null },
    },
    publishedAt: { type: Date, default: null },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// One test per year and number, drafts included, so two uploads cannot race to the same name.
testUploadSchema.index({ year: 1, testNumber: 1 }, { unique: true });
testUploadSchema.index({ createdAt: -1 });

export const TestUploadModel =
  (mongoose.models.TestUpload as mongoose.Model<TestUploadDoc> | undefined) ??
  mongoose.model<TestUploadDoc>("TestUpload", testUploadSchema);
