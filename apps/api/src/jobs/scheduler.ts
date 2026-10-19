// Timed work of Week 4, run inside the API process (like the engagement emails):
//   every minute      — publish scheduled papers, activate scheduled tests (proposal 4.2);
//   every 15 minutes  — friend invites that now count, free weeks earned (4.1);
//                       renewal reminders two days before a plan ends, and the "come back" email
//                       after 7 days without practice (4.1, "catch them leaving") — when email is set up;
//   every hour        — remove accounts deleted more than 30 days ago (4.2 "restore within 30 days").
// Each email is claimed in the database before it is sent, so a restart or a second API instance
// never sends one twice. Work that changes data is safe to repeat.
import { DailyStatModel, trusted, UserModel, type UserDoc } from "@satsharks/db";
import { createLogger, toErrorMessage } from "@satsharks/utils";
import { DELETED_RESTORE_DAYS, PAID_PLAN_LABELS, isPaidPlan } from "@satsharks/types";
import { env } from "../config/env";
import { adminService } from "../services/admin.service";
import { analyticsService } from "../services/analytics.service";
import { emailService } from "../services/email.service";
import { addDays } from "../services/engagement-rules";
import { paymentService } from "../services/payment.service";
import { invalidateCatalog } from "../services/practice.service";
import { testUploadService } from "../services/test-upload.service";
import { userAdminService } from "../services/user-admin.service";

const logger = createLogger("scheduler");
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const site = () => env.CLIENT_URL.replace(/\/$/, "");
const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";
const formatDay = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const students = () => ({ role: "student", status: "active", hidden: trusted({ $ne: true }) });

async function publishScheduled(now: Date): Promise<void> {
  const papers = await adminService.publishDue(now);
  const tests = await testUploadService.activateDue(now);
  if (papers || tests.activated) {
    invalidateCatalog();
    logger.info("Scheduled content published", { papers, tests: tests.activated });
  }
  for (const failure of tests.failed) logger.error("A scheduled test could not be activated", { failure });
}

// Two days before a paid plan ends (proposal: "an email two days before any charge"). Students who
// cancelled renewal get none.
async function renewalReminders(now: Date): Promise<number> {
  const soon = await UserModel.find({
    ...students(),
    plan: "paid",
    planExpiresAt: trusted({ $gt: now, $lte: new Date(now.getTime() + 2 * DAY_MS) }),
    autoRenew: trusted({ $ne: false }),
  })
    .limit(2000)
    .lean<UserDoc[]>();
  let sent = 0;
  for (const user of soon) {
    const endsOn = user.planExpiresAt!.toISOString().slice(0, 10);
    if (user.lastRenewalReminderFor === endsOn) continue;
    const claimed = await UserModel.updateOne({ _id: user._id, lastRenewalReminderFor: trusted({ $ne: endsOn }) }, { $set: { lastRenewalReminderFor: endsOn } });
    if (claimed.modifiedCount !== 1) continue;
    const plan = isPaidPlan(user.paidPlan) ? user.paidPlan : null;
    const ok = await emailService.sendNotice(user.email, {
      subject: "Your SAT Sharks plan ends in 2 days",
      greeting: `Hi ${firstName(user.name)},`,
      lines: [
        `Your ${plan ? PAID_PLAN_LABELS[plan] : "paid"} plan ends on ${formatDay(user.planExpiresAt!)}. After that your account moves to the free plan; your history, streak and scores are kept.`,
        "Renew now and the new period starts when this one ends, so you lose nothing. Nothing is charged automatically.",
      ],
      button: { label: "Renew my plan", link: `${site()}/checkout?plan=${plan ?? "monthly"}` },
      footer: "Not renewing? Turn off these reminders with one click on your billing page.",
    });
    if (ok) sent += 1;
  }
  return sent;
}

// Seven days after a student last practised: "your streak is gone, but your points are still waiting".
// Once per silence (keyed by the last practice day). Students who turned off progress emails get none.
async function comeBackEmails(now: Date): Promise<number> {
  const today = now.toISOString().slice(0, 10);
  // Aggregation pipelines are not sanitized: the values are day strings made here.
  const rows = await DailyStatModel.aggregate<{ _id: unknown; lastDay: string }>([
    { $match: { questions: { $gt: 0 }, day: { $gte: addDays(today, -40) } } },
    { $group: { _id: "$userId", lastDay: { $max: "$day" } } },
    { $match: { lastDay: { $gte: addDays(today, -8), $lte: addDays(today, -7) } } },
    { $limit: 2000 },
  ]);
  let sent = 0;
  for (const row of rows) {
    const user = await UserModel.findOne({ _id: row._id, ...students(), "engagement.weeklyEmail": trusted({ $ne: false }) }).lean<UserDoc>();
    if (!user || user.lastWinbackFor === row.lastDay) continue;
    const claimed = await UserModel.updateOne({ _id: user._id, lastWinbackFor: trusted({ $ne: row.lastDay }) }, { $set: { lastWinbackFor: row.lastDay } });
    if (claimed.modifiedCount !== 1) continue;
    const analytics = await analyticsService.analytics(String(user._id), false);
    const points = analytics.locked?.points ?? 0;
    const ok = await emailService.sendProgress(user.email, {
      subject: points > 0 ? `Your ${points} points are still waiting` : "We miss you on SAT Sharks",
      greeting: `Hi ${firstName(user.name)},`,
      lines: [
        points > 0
          ? `It has been a week since you practised. Your streak is gone, but your ${points} points are still waiting: they are in ${analytics.locked!.skills} skill${analytics.locked!.skills === 1 ? "" : "s"} you can fix.`
          : "It has been a week since you practised. A few questions today starts a new streak.",
        "Ten minutes is enough to get going again.",
      ],
      button: { label: "Practise now", link: `${site()}/dashboard` },
      settingsLink: `${site()}/goals`,
    });
    if (ok) sent += 1;
  }
  return sent;
}

let minute = 0;
let running = false;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  const now = new Date();
  try {
    await publishScheduled(now);
    if (minute % 15 === 0) {
      const referrals = await paymentService.processReferrals(now);
      if (referrals.qualified || referrals.rewarded) logger.info("Friend invites", referrals);
      if (emailService.isConfigured() && env.ENGAGEMENT_EMAILS !== "off") {
        const renewals = await renewalReminders(now);
        const comeBack = await comeBackEmails(now);
        if (renewals || comeBack) logger.info("Billing emails sent", { renewals, comeBack });
      }
    }
    if (minute % 60 === 0) {
      const { removed } = await userAdminService.purgeDeleted(new Date(now.getTime() - DELETED_RESTORE_DAYS * DAY_MS));
      if (removed) logger.info("Deleted accounts removed after the restore window", { removed });
    }
  } catch (error) {
    logger.error("Scheduler run failed", { error: toErrorMessage(error) });
  } finally {
    minute += 1;
    running = false;
  }
}

// Started once the database is connected.
export function startScheduler(): void {
  setInterval(() => void tick(), MINUTE_MS).unref();
  void tick();
}
