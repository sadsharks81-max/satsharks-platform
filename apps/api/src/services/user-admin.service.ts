// User management for admins: list and search users, see what they have done, change their plan
// (free / paid), disable or delete (and undo either), and change their role.
//
// Disabling or deleting takes effect on the user's very next request: requireAuth reads the status
// from the database every time. Nothing is ever hard-deleted here; a deleted account can be restored.
import {
  AttemptModel,
  effectivePlan,
  FullTestModel,
  ProblemReportModel,
  trusted,
  UserModel,
  type AttemptDoc,
  type FullTestDoc,
  type UserDoc,
} from "@satsharks/db";
import type { AdminUser, AdminUserActivity, UserListCounts } from "@satsharks/types";
import type { UpdateUserInput, UserListQuery } from "@satsharks/validation";
import mongoose from "mongoose";
import { AppError } from "../utils/app-error";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function toAdminUser(user: UserDoc): AdminUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    country: user.country ?? null,
    region: user.region ?? null,
    plan: effectivePlan(user),
    paidPlan: user.paidPlan ?? null,
    planExpiresAt: user.planExpiresAt ? user.planExpiresAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

// The query sanitizer (sanitizeFilter) is on globally and cannot be turned off per query, so every
// operator written here is wrapped in trusted(), nested ones included. Request values only ever
// appear as validated enums or inside an escaped RegExp.
const notDeleted = () => ({ status: trusted({ $ne: "deleted" }) });

// "Paid now" (an expired paid plan counts as free).
function paidNow(now: Date) {
  return { plan: "paid", $or: trusted([{ planExpiresAt: null }, { planExpiresAt: trusted({ $gt: now }) }]) };
}

function buildFilter(query: UserListQuery, now: Date): Record<string, unknown> {
  const and: Record<string, unknown>[] = [];
  // Deleted accounts only appear when asked for.
  and.push(query.status ? { status: query.status } : notDeleted());
  if (query.role) and.push({ role: query.role });
  if (query.region) and.push({ region: query.region === "unknown" ? null : query.region });
  if (query.plan === "paid") and.push(paidNow(now));
  if (query.plan === "free") and.push({ $nor: trusted([paidNow(now)]) });
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), "i");
    and.push({ $or: trusted([{ name: pattern }, { email: pattern }]) });
  }
  return { $and: trusted(and) };
}

const paidAndNotDeleted = (now: Date) => ({ $and: trusted([notDeleted(), paidNow(now)]) });

async function activeAdminCount(): Promise<number> {
  return UserModel.countDocuments({ role: "admin", status: "active" });
}

export const userAdminService = {
  async list(query: UserListQuery): Promise<{ users: AdminUser[]; total: number; page: number; pageSize: number; counts: UserListCounts }> {
    const now = new Date();
    const filter = buildFilter(query, now);
    const [users, total, all, paid, blocked, deleted] = await Promise.all([
      UserModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean<UserDoc[]>(),
      UserModel.countDocuments(filter),
      UserModel.countDocuments(notDeleted()),
      UserModel.countDocuments(paidAndNotDeleted(now)),
      UserModel.countDocuments({ status: "blocked" }),
      UserModel.countDocuments({ status: "deleted" }),
    ]);
    return { users: users.map(toAdminUser), total, page: query.page, pageSize: query.pageSize, counts: { all, paid, free: all - paid, blocked, deleted } };
  },

  async get(id: string): Promise<{ user: AdminUser; activity: AdminUserActivity }> {
    const user = await UserModel.findById(id).lean<UserDoc>();
    if (!user) throw AppError.notFound("User not found");
    const userId = new mongoose.Types.ObjectId(id);
    const [attempts, fullTests, reports] = await Promise.all([
      AttemptModel.find({ userId }).select("kind status sectionScore fullTestId createdAt updatedAt").lean<AttemptDoc[]>(),
      FullTestModel.find({ userId }).select("totalScore").lean<FullTestDoc[]>(),
      ProblemReportModel.countDocuments({ userId }),
    ]);
    const sectionScores = attempts.map((attempt) => attempt.sectionScore).filter((score): score is number => typeof score === "number");
    const totals = fullTests.map((fullTest) => fullTest.totalScore).filter((score): score is number => typeof score === "number");
    const lastActive = attempts.reduce<Date | null>((latest, attempt) => (!latest || attempt.updatedAt > latest ? attempt.updatedAt : latest), null);
    return {
      user: toAdminUser(user),
      activity: {
        drills: attempts.filter((attempt) => attempt.kind === "drill").length,
        // Full-test sections are counted under full tests, not as separate mocks.
        mocks: attempts.filter((attempt) => attempt.kind === "mock" && !attempt.fullTestId).length,
        fullTests: fullTests.length,
        completed: attempts.filter((attempt) => attempt.status === "done").length,
        bestSectionScore: sectionScores.length ? Math.max(...sectionScores) : null,
        bestTotalScore: totals.length ? Math.max(...totals) : null,
        reports,
        lastActiveAt: lastActive ? lastActive.toISOString() : null,
      },
    };
  },

  async update(id: string, actorId: string, input: UpdateUserInput): Promise<AdminUser> {
    const user = await UserModel.findById(id).lean<UserDoc>();
    if (!user) throw AppError.notFound("User not found");

    // An admin cannot lock themselves out (or lose admin access) by mistake.
    const isSelf = id === actorId;
    if (isSelf && input.status !== undefined && input.status !== user.status) throw AppError.forbidden("You cannot disable or delete your own account.");
    if (isSelf && input.role !== undefined && input.role !== user.role) throw AppError.forbidden("You cannot change your own role.");
    // The site always keeps at least one active admin.
    const losesAdmin = user.role === "admin" && user.status === "active" && ((input.role && input.role !== "admin") || (input.status && input.status !== "active"));
    if (losesAdmin && (await activeAdminCount()) <= 1) throw AppError.conflict("This is the only active admin. Make another admin first.");

    const set: Record<string, unknown> = {};
    if (input.status !== undefined) set.status = input.status;
    if (input.role !== undefined) set.role = input.role;
    if (input.plan === "free") {
      set.plan = "free";
      set.paidPlan = null;
      set.planExpiresAt = null;
    } else if (input.plan === "paid" || input.paidPlan !== undefined || input.planExpiresAt !== undefined) {
      if (input.plan === "paid") set.plan = "paid";
      if (input.paidPlan !== undefined) set.paidPlan = input.paidPlan;
      if (input.planExpiresAt !== undefined) {
        // The plan lasts to the end of the chosen day (UTC).
        const ends = input.planExpiresAt === null ? null : new Date(`${input.planExpiresAt}T23:59:59.999Z`);
        if (ends && Number.isNaN(ends.getTime())) throw AppError.badRequest("That end date is not valid");
        if (ends && ends.getTime() <= Date.now()) throw AppError.badRequest("The end date must be in the future");
        set.planExpiresAt = ends;
      }
    }

    const updated = await UserModel.findByIdAndUpdate(id, { $set: set }, { new: true }).lean<UserDoc>();
    if (!updated) throw AppError.notFound("User not found");
    return toAdminUser(updated);
  },

  async paidCount(): Promise<number> {
    return UserModel.countDocuments(paidAndNotDeleted(new Date()));
  },
};
