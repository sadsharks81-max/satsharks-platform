import mongoose from "mongoose";

const { Schema } = mongoose;

// A student's practice on one day (their own time zone): daily goal progress, streaks and the
// weekly leaderboard. Added to whenever answers are logged (QuestionLogModel).
export interface DailyStatDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  // YYYY-MM-DD in the student's time zone.
  day: string;
  // ISO week of that day, e.g. "2026-W42" (weekly leaderboard).
  week: string;
  questions: number;
  correct: number;
  seconds: number;
  points: number;
  // The daily goal was reached that day.
  goalMet: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dailyStatSchema = new Schema<DailyStatDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true },
    week: { type: String, required: true },
    questions: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    seconds: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    goalMet: { type: Boolean, default: false },
  },
  { timestamps: true },
);

dailyStatSchema.index({ userId: 1, day: 1 }, { unique: true });
// Weekly leaderboard: points per student in one week.
dailyStatSchema.index({ week: 1, userId: 1 });

export const DailyStatModel =
  (mongoose.models.DailyStat as mongoose.Model<DailyStatDoc> | undefined) ??
  mongoose.model<DailyStatDoc>("DailyStat", dailyStatSchema);
