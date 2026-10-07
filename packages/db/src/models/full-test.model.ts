import mongoose from "mongoose";
import { TIME_MULTIPLIERS, type TimeMultiplier } from "@satsharks/types";

const { Schema } = mongoose;

// Both sections of the Digital SAT in one sitting: a Reading & Writing adaptive mock, a break, then
// a Math adaptive mock. Each section is an ordinary mock attempt carrying this document's ID; the
// Math attempt is only created when the student comes back from the break, so its clock starts then.
export interface FullTestDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  timed: boolean;
  timeMultiplier: TimeMultiplier;
  // Exams each section draws from. Empty = every published exam with that section.
  paperIds: { reading_writing: mongoose.Types.ObjectId[]; math: mongoose.Types.ObjectId[] };
  // Set when this is a sitting of an uploaded practice test (fixed modules, see TestUploadModel).
  testUploadId: mongoose.Types.ObjectId | null;
  readingWritingAttemptId: mongoose.Types.ObjectId | null;
  mathAttemptId: mongoose.Types.ObjectId | null;
  // 400–1600: the two section scores added together, once both exist.
  totalScore: number | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const fullTestSchema = new Schema<FullTestDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    timed: { type: Boolean, default: true },
    timeMultiplier: { type: Number, enum: TIME_MULTIPLIERS, default: 1 },
    paperIds: {
      reading_writing: { type: [Schema.Types.ObjectId], ref: "Paper", default: [] },
      math: { type: [Schema.Types.ObjectId], ref: "Paper", default: [] },
    },
    testUploadId: { type: Schema.Types.ObjectId, ref: "TestUpload", default: null },
    readingWritingAttemptId: { type: Schema.Types.ObjectId, ref: "Attempt", default: null },
    mathAttemptId: { type: Schema.Types.ObjectId, ref: "Attempt", default: null },
    totalScore: { type: Number, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

fullTestSchema.index({ userId: 1, createdAt: -1 });

export const FullTestModel =
  (mongoose.models.FullTest as mongoose.Model<FullTestDoc> | undefined) ?? mongoose.model<FullTestDoc>("FullTest", fullTestSchema);
