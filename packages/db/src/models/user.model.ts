import mongoose from "mongoose";
import {
  GOAL_TYPES,
  LEGACY_PAID_PLANS,
  PAID_PLANS,
  USER_PLANS,
  USER_REGIONS,
  USER_ROLES,
  USER_STATUSES,
  type GoalType,
  type PaidPlan,
  type UserPlan,
  type UserRegion,
  type UserRole,
  type UserStatus,
} from "@satsharks/types";

const { Schema } = mongoose;

// Goals, reminders and leaderboard choices (Goals & streaks page). Defaults apply until saved.
export interface UserEngagement {
  targetScore: number | null;
  testDate: string | null;
  goalType: GoalType;
  // null = the suggested goal.
  goalAmount: number | null;
  // IANA zone sent by the student's browser; days, streaks and reminders follow it.
  timeZone: string | null;
  showOnLeaderboard: boolean;
  streakReminders: boolean;
  weeklyEmail: boolean;
}

// Days are YYYY-MM-DD in the student's time zone.
export interface UserStreak {
  current: number;
  longest: number;
  // The last day the daily goal was met.
  lastDay: string | null;
  // Missed days covered by a streak freeze (newest kept).
  freezeDays: string[];
  // Milestones reached (7, 30, 100 days) and when.
  badges: { days: number; earnedAt: Date }[];
}

export interface UserDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  // ISO 3166-1 alpha-2 code picked at sign-up. null for accounts made before it was asked.
  country: string | null;
  // Follows from country: PK = local, anything else = international.
  region: UserRegion | null;
  // Free or paid, set by an admin (payments will set it later). A paid plan ends at planExpiresAt
  // (null = no end date); after that the account counts as free (see effectivePlan).
  plan: UserPlan;
  paidPlan: PaidPlan | null;
  planExpiresAt: Date | null;
  // Sessions signed before this moment are rejected (set when the password is reset).
  passwordChangedAt: Date | null;
  // Students use one device at a time: each login stores a new random ID here and in the session
  // token, and a token carrying another ID (the device signed in before) is rejected. null until
  // the first login with this rule; staff and admins are not limited.
  sessionId: string | null;
  // Developer accounts made with `create:admin --hidden`: left out of the admin Users page, its
  // counts and the dashboard stats, and cannot be opened or changed there by any admin.
  hidden: boolean;
  // Password reset: SHA-256 of the emailed token (the token itself is never stored) and its expiry.
  // Cleared when the token is used, so a link works once.
  resetTokenHash: string | null;
  resetTokenExpiresAt: Date | null;
  engagement: UserEngagement;
  streak: UserStreak;
  // All-time practice points (leaderboard). Weekly points come from DailyStatModel.
  totalPoints: number;
  // Given to friends so they can add this student; made on first use.
  friendCode: string | null;
  friends: mongoose.Types.ObjectId[];
  // Emails already sent, so a reminder or the weekly email goes out once.
  lastStreakReminderDay: string | null;
  lastWeeklyEmailWeek: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    // Never returned by default; auth code must ask for it with .select("+passwordHash").
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "student", index: true },
    status: { type: String, enum: USER_STATUSES, default: "active", index: true },
    country: { type: String, uppercase: true, minlength: 2, maxlength: 2, default: null },
    region: { type: String, enum: [...USER_REGIONS, null], default: null, index: true },
    plan: { type: String, enum: USER_PLANS, default: "free", index: true },
    // Older accounts may still hold a plan no longer offered (LEGACY_PAID_PLANS); their access is unchanged.
    paidPlan: { type: String, enum: [...PAID_PLANS, ...LEGACY_PAID_PLANS, null], default: null },
    planExpiresAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    sessionId: { type: String, default: null },
    hidden: { type: Boolean, default: false },
    resetTokenHash: { type: String, default: null, select: false },
    resetTokenExpiresAt: { type: Date, default: null, select: false },
    engagement: {
      type: new Schema<UserEngagement>(
        {
          targetScore: { type: Number, default: null },
          testDate: { type: String, default: null },
          goalType: { type: String, enum: GOAL_TYPES, default: "questions" },
          goalAmount: { type: Number, default: null },
          timeZone: { type: String, default: null },
          showOnLeaderboard: { type: Boolean, default: true },
          streakReminders: { type: Boolean, default: true },
          weeklyEmail: { type: Boolean, default: true },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    streak: {
      type: new Schema<UserStreak>(
        {
          current: { type: Number, default: 0 },
          longest: { type: Number, default: 0 },
          lastDay: { type: String, default: null },
          freezeDays: { type: [String], default: [] },
          badges: { type: [new Schema({ days: Number, earnedAt: Date }, { _id: false })], default: [] },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    totalPoints: { type: Number, default: 0 },
    friendCode: { type: String, default: null },
    friends: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    lastStreakReminderDay: { type: String, default: null },
    lastWeeklyEmailWeek: { type: String, default: null },
  },
  { timestamps: true },
);

// Reset links look the user up by token hash. Sparse: most users have none.
userSchema.index({ resetTokenHash: 1 }, { sparse: true });
// All-time leaderboard.
userSchema.index({ totalPoints: -1 });
// Adding a friend by code. Partial: most accounts have none yet.
userSchema.index({ friendCode: 1 }, { unique: true, partialFilterExpression: { friendCode: { $type: "string" } } });

// The plan that applies right now. The only place this rule lives.
export function effectivePlan(user: Pick<UserDoc, "plan" | "planExpiresAt">, now = new Date()): UserPlan {
  if (user.plan !== "paid") return "free";
  return user.planExpiresAt && user.planExpiresAt.getTime() <= now.getTime() ? "free" : "paid";
}

export const UserModel =
  (mongoose.models.User as mongoose.Model<UserDoc> | undefined) ?? mongoose.model<UserDoc>("User", userSchema);
