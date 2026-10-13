// Streak reminders and the weekly progress email (proposal 3.3), sent from the API process every
// 15 minutes. Each student gets them at a local hour in their own time zone:
//   - streak at risk: 7–10 pm, when today's goal is not met and the streak would end tonight;
//   - weekly progress: Monday 9 am–noon, about the week before.
// Each send is claimed in the database first (lastStreakReminderDay / lastWeeklyEmailWeek), so a
// restart or a second instance never sends one twice.
import { DailyStatModel, trusted, UserModel, type DailyStatDoc, type UserDoc } from "@satsharks/db";
import { createLogger, toErrorMessage } from "@satsharks/utils";
import { env } from "../config/env";
import { analyticsService } from "../services/analytics.service";
import { emailService } from "../services/email.service";
import { addDays, dayIn, isoWeek, localClock, streakOn } from "../services/engagement-rules";
import { freezesPerMonth, streakOf, timeZoneOf } from "../services/engagement.service";

const logger = createLogger("engagement-emails");
const TICK_MS = 15 * 60_000;
const site = () => env.CLIENT_URL.replace(/\/$/, "");
const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

const students = () => ({ role: "student", status: "active", hidden: trusted({ $ne: true }) });

async function streakReminders(now: Date): Promise<number> {
  const recent = addDays(now.toISOString().slice(0, 10), -3);
  const candidates = await UserModel.find({
    ...students(),
    "streak.current": trusted({ $gte: 1 }),
    "streak.lastDay": trusted({ $gte: recent }),
    "engagement.streakReminders": trusted({ $ne: false }),
  })
    .limit(5000)
    .lean<UserDoc[]>();
  let sent = 0;
  for (const user of candidates) {
    const zone = timeZoneOf(user);
    const today = dayIn(now, zone);
    const { hour } = localClock(now, zone);
    if (hour < 19 || hour >= 22 || user.lastStreakReminderDay === today) continue;
    const streak = streakOn(streakOf(user), today, freezesPerMonth(user));
    if (streak.today || streak.current === 0) continue;
    const claimed = await UserModel.updateOne({ _id: user._id, lastStreakReminderDay: trusted({ $ne: today }) }, { $set: { lastStreakReminderDay: today } });
    if (claimed.modifiedCount !== 1) continue;
    const ok = await emailService.sendProgress(user.email, {
      subject: `Your ${streak.current}-day streak ends tonight`,
      greeting: `Hi ${firstName(user.name)},`,
      lines: [
        `You have practised ${streak.current} day${streak.current === 1 ? "" : "s"} in a row. Reach today's goal before midnight to keep it going.`,
        streak.freezesLeft > 0
          ? `You still have ${streak.freezesLeft} streak freeze${streak.freezesLeft === 1 ? "" : "s"} this month, but a few questions now keeps them for a real emergency.`
          : "You have no streak freezes left this month.",
      ],
      button: { label: "Practise now", link: `${site()}/dashboard` },
      settingsLink: `${site()}/goals`,
    });
    if (ok) sent += 1;
  }
  return sent;
}

async function weeklyEmails(now: Date): Promise<number> {
  const since = addDays(now.toISOString().slice(0, 10), -29);
  const active = await DailyStatModel.distinct("userId", { day: trusted({ $gte: since }), questions: trusted({ $gt: 0 }) });
  if (active.length === 0) return 0;
  const candidates = await UserModel.find({ ...students(), _id: trusted({ $in: active }), "engagement.weeklyEmail": trusted({ $ne: false }) })
    .limit(5000)
    .lean<UserDoc[]>();
  let sent = 0;
  for (const user of candidates) {
    const zone = timeZoneOf(user);
    const today = dayIn(now, zone);
    const week = isoWeek(today);
    const { hour, weekday } = localClock(now, zone);
    if (weekday !== 1 || hour < 9 || hour >= 12 || user.lastWeeklyEmailWeek === week) continue;
    const claimed = await UserModel.updateOne({ _id: user._id, lastWeeklyEmailWeek: trusted({ $ne: week }) }, { $set: { lastWeeklyEmailWeek: week } });
    if (claimed.modifiedCount !== 1) continue;

    // The week that just ended (Monday to Sunday).
    const lastWeek = isoWeek(addDays(today, -7));
    const [stats, predicted, focus] = await Promise.all([
      DailyStatModel.find({ userId: user._id, week: lastWeek }).lean<DailyStatDoc[]>(),
      analyticsService.predictedTotal(String(user._id)),
      analyticsService.focusSkill(String(user._id)),
    ]);
    const questions = stats.reduce((sum, stat) => sum + stat.questions, 0);
    const minutes = Math.round(stats.reduce((sum, stat) => sum + stat.seconds, 0) / 60);
    const streak = streakOn(streakOf(user), today, freezesPerMonth(user));
    const ok = await emailService.sendProgress(user.email, {
      subject: predicted ? `Your week on SAT Sharks: predicted score ${predicted}` : "Your week on SAT Sharks",
      greeting: `Hi ${firstName(user.name)},`,
      lines: [
        questions > 0 ? "Here is what you did last week." : "You did not practise last week. A few questions today gets you going again.",
        focus ? `Focus next on ${focus.skill}: about ${focus.pointsToGain} points to gain.` : "Finish a full test to see which topics cost you points.",
      ],
      rows: [
        ["Predicted score", predicted ? String(predicted) : "After your first full test"],
        ["Questions answered", String(questions)],
        ["Time practised", `${minutes} min`],
        ["Daily goal reached", `${stats.filter((stat) => stat.goalMet).length} of 7 days`],
        ["Practice points", String(stats.reduce((sum, stat) => sum + stat.points, 0))],
        ["Current streak", `${streak.current} day${streak.current === 1 ? "" : "s"}`],
      ],
      button: { label: focus ? `Practise ${focus.skill}` : "Open SAT Sharks", link: `${site()}/analytics` },
      settingsLink: `${site()}/goals`,
    });
    if (ok) sent += 1;
  }
  return sent;
}

let running = false;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const reminders = await streakReminders(now);
    const weekly = await weeklyEmails(now);
    if (reminders || weekly) logger.info("Engagement emails sent", { reminders, weekly });
  } catch (error) {
    logger.error("Engagement email run failed", { error: toErrorMessage(error) });
  } finally {
    running = false;
  }
}

// Started once the database is connected. Off without Resend (nothing could be sent) or with
// ENGAGEMENT_EMAILS=off.
export function startEngagementEmails(): void {
  if (env.ENGAGEMENT_EMAILS === "off") return logger.info("Engagement emails are off (ENGAGEMENT_EMAILS=off)");
  if (!emailService.isConfigured()) return logger.info("Engagement emails are off: email is not configured");
  setInterval(() => void tick(), TICK_MS).unref();
  void tick();
}
