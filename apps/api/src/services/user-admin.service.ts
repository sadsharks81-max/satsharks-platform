// User management for admins: list and search users, see what they have done, change their plan
// (free / paid), disable or delete (and undo either), and change their role.
//
// Disabling or deleting takes effect on the user's very next request: requireAuth reads the status
// from the database every time. A deleted account can be restored until an admin clears the deleted
// accounts (purgeDeleted), which removes them and their practice data for good.
import {
  AttemptModel,
  DailyStatModel,
  effectivePlan,
  FullTestModel,
  MistakeModel,
  ProblemReportModel,
  QuestionLogModel,
  trusted,
  UserModel,
  type AttemptDoc,
  type FullTestDoc,
  type UserDoc,
} from "@satsharks/db";
import { DELETED_RESTORE_DAYS, isPaidPlan, type AdminUser, type AdminUserActivity, type UserListCounts } from "@satsharks/types";
import type { BulkUsersInput, UpdateUserInput, UserListQuery } from "@satsharks/validation";
import mongoose from "mongoose";
import { AppError } from "../utils/app-error";
import { csvCell } from "./payment-rules";

const DAY_MS = 86_400_000;

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
    // A plan no longer offered (e.g. Till Test Day) shows as plain "Paid".
    paidPlan: isPaidPlan(user.paidPlan) ? user.paidPlan : null,
    planExpiresAt: user.planExpiresAt ? user.planExpiresAt.toISOString() : null,
    phone: user.phone ?? null,
    deletedAt: user.status === "deleted" && user.deletedAt ? user.deletedAt.toISOString() : null,
    restorableUntil: user.status === "deleted" && user.deletedAt ? new Date(user.deletedAt.getTime() + DELETED_RESTORE_DAYS * DAY_MS).toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

// The query sanitizer (sanitizeFilter) is on globally and cannot be turned off per query, so every
// operator written here is wrapped in trusted(), nested ones included. Request values only ever
// appear as validated enums or inside an escaped RegExp.
const notDeleted = () => ({ status: trusted({ $ne: "deleted" }), ...visible() });

// Hidden developer accounts (UserDoc.hidden) never appear here, in any list, count or lookup.
export const visible = () => ({ hidden: trusted({ $ne: true }) });

async function findVisible(id: string): Promise<UserDoc> {
  const user = await UserModel.findOne({ _id: id, ...visible() }).lean<UserDoc>();
  if (!user) throw AppError.notFound("User not found");
  return user;
}

// "Paid now" (an expired paid plan counts as free).
function paidNow(now: Date) {
  return { plan: "paid", $or: trusted([{ planExpiresAt: null }, { planExpiresAt: trusted({ $gt: now }) }]) };
}

function buildFilter(query: Omit<UserListQuery, "page" | "pageSize">, now: Date): Record<string, unknown> {
  const and: Record<string, unknown>[] = [visible()];
  // Deleted accounts only appear when asked for.
  and.push(query.status ? { status: query.status } : notDeleted());
  if (query.role) and.push({ role: query.role });
  if (query.region) and.push({ region: query.region === "unknown" ? null : query.region });
  if (query.plan === "paid") and.push(paidNow(now));
  if (query.plan === "free") and.push({ $nor: trusted([paidNow(now)]) });
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), "i");
    const or: Record<string, unknown>[] = [{ name: pattern }, { email: pattern }];
    // Phone numbers are stored as digits (with an optional +); "0300 123-4567" finds "+923001234567"
    // by its last digits.
    const digits = query.search.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length >= 4) or.push({ phone: new RegExp(escapeRegex(digits)) });
    and.push({ $or: trusted(or) });
  }
  return { $and: trusted(and) };
}

const paidAndNotDeleted = (now: Date) => ({ $and: trusted([notDeleted(), paidNow(now)]) });

async function activeAdminCount(): Promise<number> {
  // A hidden admin does not count: the site's own admins must always keep one of their own.
  return UserModel.countDocuments({ role: "admin", status: "active", ...visible() });
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
      UserModel.countDocuments({ status: "blocked", ...visible() }),
      UserModel.countDocuments({ status: "deleted", ...visible() }),
    ]);
    return { users: users.map(toAdminUser), total, page: query.page, pageSize: query.pageSize, counts: { all, paid, free: all - paid, blocked, deleted } };
  },

  async get(id: string): Promise<{ user: AdminUser; activity: AdminUserActivity }> {
    const user = await findVisible(id);
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
    const user = await findVisible(id);

    // An admin cannot lock themselves out (or lose admin access) by mistake.
    const isSelf = id === actorId;
    if (isSelf && input.status !== undefined && input.status !== user.status) throw AppError.forbidden("You cannot disable or delete your own account.");
    if (isSelf && input.role !== undefined && input.role !== user.role) throw AppError.forbidden("You cannot change your own role.");
    // The site always keeps at least one active admin.
    const losesAdmin = user.role === "admin" && user.status === "active" && ((input.role && input.role !== "admin") || (input.status && input.status !== "active"));
    if (losesAdmin && (await activeAdminCount()) <= 1) throw AppError.conflict("This is the only active admin. Make another admin first.");

    const set: Record<string, unknown> = {};
    if (input.status !== undefined) set.status = input.status;
    // The restore window starts when the account is deleted, and ends if it is restored.
    if (input.status === "deleted" && user.status !== "deleted") set.deletedAt = new Date();
    if (input.status !== undefined && input.status !== "deleted") set.deletedAt = null;
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

  // Removes every deleted account for good, with its tests, history, mistakes and points, and takes it
  // off other students' friend lists. Problem reports are kept (they are about questions) and show no
  // reporter. `olderThan`: only accounts deleted before that moment (the scheduler's 30-day clean-up; accounts
  // deleted before deletedAt existed are left for an admin to clear).
  async purgeDeleted(olderThan?: Date): Promise<{ removed: number }> {
    const filter = olderThan ? { status: "deleted", deletedAt: trusted({ $ne: null, $lte: olderThan }), ...visible() } : { status: "deleted", ...visible() };
    return purgeMatching(filter);
  },

  // Delete, restore or permanently remove many accounts at once (Admin → Users, ticked or "select
  // all"). The acting admin and every admin account are always left out, so a "delete all" can never
  // lock the site's admins out; admins are changed one at a time on their own page.
  async bulk(actorId: string, input: BulkUsersInput): Promise<{ changed: number; skipped: number }> {
    const chosen = input.ids ? { _id: trusted({ $in: input.ids }), ...visible() } : buildFilter(input.filter!, new Date());
    const allowed = { _id: trusted({ $ne: new mongoose.Types.ObjectId(actorId) }), role: trusted({ $ne: "admin" }) };
    const wanted = { delete: { status: trusted({ $ne: "deleted" }) }, restore: { status: "deleted" }, purge: { status: "deleted" } }[input.action];
    const filter = { $and: trusted([chosen, allowed, wanted]) };
    const [matching, total] = await Promise.all([UserModel.countDocuments(filter), UserModel.countDocuments(chosen)]);
    let changed: number;
    if (input.action === "purge") {
      changed = (await purgeMatching(filter)).removed;
    } else {
      const set = input.action === "delete" ? { status: "deleted", deletedAt: new Date() } : { status: "active", deletedAt: null };
      changed = (await UserModel.updateMany(filter, { $set: set })).modifiedCount;
    }
    return { changed, skipped: Math.max(0, total - matching) };
  },

  // The list as CSV (same filters as the page, every page), for a spreadsheet.
  async exportCsv(query: UserListQuery): Promise<string> {
    const users = await UserModel.find(buildFilter(query, new Date())).sort({ createdAt: -1 }).limit(50_000).lean<UserDoc[]>();
    const header = ["Name", "Email", "Phone", "Country", "Region", "Role", "Status", "Plan", "Paid plan", "Plan ends", "Joined"];
    const rows = users.map((user) => {
      const view = toAdminUser(user);
      return [view.name, view.email, view.phone, view.country, view.region, view.role, view.status, view.plan, view.paidPlan, view.planExpiresAt?.slice(0, 10), view.createdAt.slice(0, 10)];
    });
    // A byte-order mark so Excel reads names in Urdu or with accents correctly.
    return "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  },

  async paidCount(): Promise<number> {
    return UserModel.countDocuments(paidAndNotDeleted(new Date()));
  },
};

// Removes the matching deleted accounts for good (see purgeDeleted).
// One account at a time, and only while it is still deleted, so one restored meanwhile is kept.
async function purgeMatching(filter: Record<string, unknown>): Promise<{ removed: number }> {
  const users = await UserModel.find(filter).select("_id").lean<UserDoc[]>();
  let removed = 0;
  for (const { _id: userId } of users) {
    const gone = await UserModel.findOneAndDelete({ _id: userId, status: "deleted" }).select("_id").lean<UserDoc>();
    if (!gone) continue;
    await Promise.all([
      AttemptModel.deleteMany({ userId }),
      FullTestModel.deleteMany({ userId }),
      QuestionLogModel.deleteMany({ userId }),
      MistakeModel.deleteMany({ userId }),
      DailyStatModel.deleteMany({ userId }),
      UserModel.updateMany({ friends: userId }, { $pull: { friends: userId } }),
    ]);
    removed += 1;
  }
  return { removed };
}
