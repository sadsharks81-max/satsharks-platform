import mongoose from "mongoose";
import { PAID_PLANS, USER_PLANS, USER_REGIONS, USER_ROLES, USER_STATUSES, type PaidPlan, type UserPlan, type UserRegion, type UserRole, type UserStatus } from "@satsharks/types";

const { Schema } = mongoose;

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
  // Password reset: SHA-256 of the emailed token (the token itself is never stored) and its expiry.
  // Cleared when the token is used, so a link works once.
  resetTokenHash: string | null;
  resetTokenExpiresAt: Date | null;
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
    paidPlan: { type: String, enum: [...PAID_PLANS, null], default: null },
    planExpiresAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    resetTokenHash: { type: String, default: null, select: false },
    resetTokenExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

// Reset links look the user up by token hash. Sparse: most users have none.
userSchema.index({ resetTokenHash: 1 }, { sparse: true });

// The plan that applies right now. The only place this rule lives.
export function effectivePlan(user: Pick<UserDoc, "plan" | "planExpiresAt">, now = new Date()): UserPlan {
  if (user.plan !== "paid") return "free";
  return user.planExpiresAt && user.planExpiresAt.getTime() <= now.getTime() ? "free" : "paid";
}

export const UserModel =
  (mongoose.models.User as mongoose.Model<UserDoc> | undefined) ?? mongoose.model<UserDoc>("User", userSchema);
