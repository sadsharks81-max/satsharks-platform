// What a free account may open (Admin → Access). Paid accounts, staff and admins may open everything.
//
// Checked when something is started; attempts and full tests already begun can always be finished,
// so changing a rule or a plan running out never strands a student mid-test.
import { effectivePlan, type UserDoc } from "@satsharks/db";
import { ACCESS_FEATURE_LABELS, ACCESS_FEATURES, contentAccessLevel, type AccessFeature, type AccessSettings, type PracticeAccess } from "@satsharks/types";
import { AppError } from "../utils/app-error";
import { settingsService } from "./settings.service";

export interface UserAccess {
  paid: boolean;
  feature(feature: AccessFeature): boolean;
  // An exam or uploaded test by its access key (see uploadAccessKey).
  content(key: string): boolean;
  summary: PracticeAccess;
}

export function hasPaidAccess(user: Pick<UserDoc, "role" | "plan" | "planExpiresAt">): boolean {
  return user.role !== "student" || effectivePlan(user) === "paid";
}

export function accessFor(user: Pick<UserDoc, "role" | "plan" | "planExpiresAt">, settings: AccessSettings): UserAccess {
  const paid = hasPaidAccess(user);
  const feature = (name: AccessFeature) => paid || settings.features[name] === "free";
  return {
    paid,
    feature,
    content: (key) => paid || contentAccessLevel(settings, key) === "free",
    summary: { paid, features: Object.fromEntries(ACCESS_FEATURES.map((name) => [name, feature(name)])) as Record<AccessFeature, boolean> },
  };
}

export async function userAccess(user: Pick<UserDoc, "role" | "plan" | "planExpiresAt">): Promise<UserAccess> {
  return accessFor(user, await settingsService.getAccess());
}

// `subject` carries its verb: "This exam is", "Practice drills are".
export const paidOnly = (subject: string) => AppError.forbidden(`${subject} only available on the paid plans. See the Pricing page to upgrade.`);

export function requireFeature(access: UserAccess, feature: AccessFeature): void {
  if (!access.feature(feature)) throw paidOnly(`${ACCESS_FEATURE_LABELS[feature].label} are`);
}

export function requireContent(access: UserAccess, key: string, subject = "This exam is"): void {
  if (!access.content(key)) throw paidOnly(subject);
}
