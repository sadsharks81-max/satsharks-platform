// What a free account may open (Admin → Access). Paid accounts, staff and admins may open everything
// except invite-only exams and tests, which open with their invite code (staff and admins: always).
//
// Checked when something is started; attempts and full tests already begun can always be finished,
// so changing a rule or a plan running out never strands a student mid-test.
import { AttemptModel, effectivePlan, type UserDoc } from "@satsharks/db";
import {
  ACCESS_FEATURE_LABELS,
  ACCESS_FEATURES,
  contentRule,
  type AccessFeature,
  type AccessRule,
  type AccessSettings,
  type LockReason,
  type PracticeAccess,
} from "@satsharks/types";
import mongoose from "mongoose";
import { AppError } from "../utils/app-error";
import { startOfLocalDay } from "./engagement-rules";
import { settingsService } from "./settings.service";

type AccessUser = Pick<UserDoc, "role" | "plan" | "planExpiresAt"> & Partial<Pick<UserDoc, "_id" | "inviteKeys" | "engagement" | "region">>;

export interface UserAccess {
  paid: boolean;
  feature(feature: AccessFeature): boolean;
  // An exam or uploaded test by its access key (see uploadAccessKey).
  content(key: string): boolean;
  // Why `content(key)` is false; null when it can be opened.
  lockReason(key: string): LockReason | null;
  // Pin, label and level of an exam or test.
  rule(key: string): AccessRule;
  // Free accounts with a daily drill limit: questions still allowed today. null = no limit.
  drillsLeftToday: number | null;
  summary: PracticeAccess;
}

export function hasPaidAccess(user: Pick<UserDoc, "role" | "plan" | "planExpiresAt">): boolean {
  return user.role !== "student" || effectivePlan(user) === "paid";
}

export function accessFor(user: AccessUser, settings: AccessSettings, drillsUsedToday = 0): UserAccess {
  const paid = hasPaidAccess(user);
  const staff = user.role !== "student";
  const invited = new Set(user.inviteKeys ?? []);
  const feature = (name: AccessFeature) => paid || settings.features[name] === "free";
  const lockReason = (key: string): LockReason | null => {
    if (staff) return null;
    const { level } = contentRule(settings, key);
    if (level === "free") return null;
    if (level === "invite") return invited.has(key) ? null : "invite";
    return paid ? null : "paid";
  };
  const limit = !paid && settings.freeDrillQuestionsPerDay !== null ? settings.freeDrillQuestionsPerDay : null;
  return {
    paid,
    feature,
    content: (key) => lockReason(key) === null,
    lockReason,
    rule: (key) => contentRule(settings, key),
    drillsLeftToday: limit === null ? null : Math.max(0, limit - drillsUsedToday),
    summary: {
      paid,
      features: Object.fromEntries(ACCESS_FEATURES.map((name) => [name, feature(name)])) as Record<AccessFeature, boolean>,
      dailyDrill: limit === null ? null : { limit, used: Math.min(limit, drillsUsedToday) },
    },
  };
}

// Drill questions this student started today (their own day): exam and bank drills, not mistake retries.
export async function drillQuestionsToday(user: Pick<UserDoc, "_id" | "engagement" | "region">, now = new Date()): Promise<number> {
  const zone = user.engagement?.timeZone ?? (user.region === "international" ? "UTC" : null);
  const since = startOfLocalDay(now, zone ?? "Asia/Karachi");
  // Aggregation pipelines are not sanitized: values are an ObjectId, a Date and fixed strings.
  const rows = await AttemptModel.aggregate<{ n: number }>([
    { $match: { userId: new mongoose.Types.ObjectId(String(user._id)), kind: "drill", origin: { $ne: "retry" }, createdAt: { $gte: since } } },
    { $group: { _id: null, n: { $sum: { $size: "$items" } } } },
  ]);
  return rows[0]?.n ?? 0;
}

export async function userAccess(user: AccessUser): Promise<UserAccess> {
  const settings = await settingsService.getAccess();
  const limited = !hasPaidAccess(user) && settings.freeDrillQuestionsPerDay !== null && user._id;
  const used = limited ? await drillQuestionsToday(user as Pick<UserDoc, "_id" | "engagement" | "region">) : 0;
  return accessFor(user, settings, used);
}

// `subject` carries its verb: "This exam is", "Practice drills are".
export const paidOnly = (subject: string) => AppError.forbidden(`${subject} only available on the paid plans. See the Pricing page to upgrade.`);

export function requireFeature(access: UserAccess, feature: AccessFeature): void {
  if (!access.feature(feature)) throw paidOnly(`${ACCESS_FEATURE_LABELS[feature].label} are`);
}

export function requireContent(access: UserAccess, key: string, subject = "This exam is"): void {
  const reason = access.lockReason(key);
  if (reason === "invite") throw AppError.forbidden(`${subject} open by invite code only. Enter your code on the Home page.`);
  if (reason === "paid") throw paidOnly(subject);
}

// How many questions a new drill may have: `wanted`, cut to what is left of a free account's daily
// limit. Refused when nothing is left today.
export function drillSize(access: UserAccess, wanted: number): number {
  if (access.drillsLeftToday === null) return wanted;
  if (access.drillsLeftToday <= 0) {
    throw new AppError(
      403,
      "daily_limit",
      `Free accounts can practise ${access.summary.dailyDrill?.limit ?? 0} drill questions a day, and today's are used. Come back tomorrow, or upgrade on the Pricing page for unlimited drills.`,
    );
  }
  return Math.min(wanted, access.drillsLeftToday);
}
