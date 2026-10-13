// Daily goals, streaks, points, leaderboards, friends and the share card (proposal 3.3).
import { randomInt } from "node:crypto";
import { DailyStatModel, FullTestModel, MistakeModel, trusted, UserModel, type DailyStatDoc, type FullTestDoc, type UserDoc, type UserEngagement } from "@satsharks/db";
import {
  POINTS,
  STREAK_FREEZES_PER_MONTH,
  STREAK_MILESTONES,
  type EngagementSettings,
  type EngagementSummary,
  type Leaderboard,
  type LeaderboardPeriod,
  type LeaderboardRow,
  type LeaderboardScope,
  type ShareCard,
  type StreakView,
} from "@satsharks/types";
import type { EngagementSettingsInput } from "@satsharks/validation";
import mongoose from "mongoose";
import { AppError } from "../utils/app-error";
import { hasPaidAccess } from "./access.service";
import { analyticsService } from "./analytics.service";
import { addDays, dayIn, daysBetween, emptyStreak, isoWeek, safeTimeZone, streakOn, suggestGoal, type StreakState } from "./engagement-rules";
import { settingsService } from "./settings.service";

type EngagementUser = Pick<UserDoc, "_id" | "role" | "plan" | "planExpiresAt" | "engagement" | "streak" | "region">;

const DEFAULT_ENGAGEMENT: UserEngagement = {
  targetScore: null,
  testDate: null,
  goalType: "questions",
  goalAmount: null,
  timeZone: null,
  showOnLeaderboard: true,
  streakReminders: true,
  weeklyEmail: true,
};

// Accounts made before Week 3 have none of these fields (users are read with lean()).
export const engagementOf = (user: Pick<UserDoc, "engagement">): UserEngagement => ({ ...DEFAULT_ENGAGEMENT, ...(user.engagement ?? {}) });
export const streakOf = (user: Pick<UserDoc, "streak">): StreakState => ({ ...emptyStreak(), ...(user.streak ?? {}) });
export const freezesPerMonth = (user: Pick<UserDoc, "role" | "plan" | "planExpiresAt">) =>
  hasPaidAccess(user) ? STREAK_FREEZES_PER_MONTH.paid : STREAK_FREEZES_PER_MONTH.free;
// Pakistan by default (most students); the browser's own zone replaces it on the first visit.
export const timeZoneOf = (user: Pick<UserDoc, "engagement" | "region">) =>
  safeTimeZone(user.engagement?.timeZone ?? (user.region === "international" ? "UTC" : null));

function settingsView(user: EngagementUser): EngagementSettings {
  const e = engagementOf(user);
  return {
    targetScore: e.targetScore,
    testDate: e.testDate,
    goalType: e.goalType,
    goalAmount: e.goalAmount,
    timeZone: timeZoneOf(user),
    showOnLeaderboard: e.showOnLeaderboard,
    streakReminders: e.streakReminders,
    weeklyEmail: e.weeklyEmail,
  };
}

// The student's own test date, or the next SAT date an admin has listed.
async function testDateFor(user: EngagementUser, today: string): Promise<{ date: string | null; fromSettings: boolean }> {
  const own = engagementOf(user).testDate;
  if (own && own >= today) return { date: own, fromSettings: true };
  const { dates } = await settingsService.getSatDates();
  const next = dates.map((entry) => entry.date).filter((date) => date >= today).sort()[0] ?? null;
  return { date: next, fromSettings: false };
}

function streakView(user: EngagementUser, today: string): StreakView {
  const state = streakOf(user);
  const perMonth = freezesPerMonth(user);
  const now = streakOn(state, today, perMonth);
  return {
    current: now.current,
    longest: state.longest,
    today: now.today,
    atRisk: now.atRisk,
    freezesLeft: now.freezesLeft,
    freezesPerMonth: perMonth,
    frozenDays: state.freezeDays.filter((day) => day.slice(0, 7) === today.slice(0, 7)),
    badges: STREAK_MILESTONES.map((days) => {
      const badge = state.badges.find((entry) => entry.days === days);
      return { days, earnedAt: badge ? new Date(badge.earnedAt).toISOString() : null };
    }),
  };
}

// "Ayesha R." — enough to recognise a friend without showing full names to everyone.
function publicName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Student";
  return words.length === 1 ? words[0]! : `${words[0]} ${words[words.length - 1]![0]!.toUpperCase()}.`;
}

// Leaderboards list students only: active, not hidden, not opted out.
const onBoard = () => ({ role: "student", status: "active", hidden: trusted({ $ne: true }), "engagement.showOnLeaderboard": trusted({ $ne: false }) });

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

async function ensureFriendCode(user: Pick<UserDoc, "_id" | "friendCode">): Promise<string> {
  if (user.friendCode) return user.friendCode;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
    try {
      const updated = await UserModel.findOneAndUpdate({ _id: user._id, friendCode: null }, { $set: { friendCode: code } }, { new: true }).lean<UserDoc>();
      if (updated?.friendCode) return updated.friendCode;
      // Another request set it first.
      const current = await UserModel.findById(user._id).select("friendCode").lean<UserDoc>();
      if (current?.friendCode) return current.friendCode;
    } catch (error) {
      if ((error as { code?: unknown }).code !== 11000) throw error;
    }
  }
  throw AppError.unavailable("Could not create a friend code. Please try again.");
}

export const engagementService = {
  // Today's goal: the student's own amount, or the one suggested from the gap to the target score
  // and the days left before the test.
  async goalFor(user: EngagementUser, now = new Date()): Promise<{ type: EngagementSettings["goalType"]; amount: number; suggested: number; reason: string }> {
    const e = engagementOf(user);
    const today = dayIn(now, timeZoneOf(user));
    const [test, predicted] = await Promise.all([testDateFor(user, today), analyticsService.predictedTotal(String(user._id))]);
    const gap = e.targetScore !== null && predicted !== null ? e.targetScore - predicted : null;
    const daysLeft = test.date ? daysBetween(today, test.date) : null;
    const suggestion = suggestGoal(e.goalType, gap, daysLeft);
    return { type: e.goalType, amount: e.goalAmount ?? suggestion.amount, suggested: suggestion.amount, reason: suggestion.reason };
  },

  async summary(user: UserDoc, now = new Date()): Promise<EngagementSummary> {
    const today = dayIn(now, timeZoneOf(user));
    const first = addDays(today, -13);
    const [stats, goal, test, prediction, friendCode, mistakesDue] = await Promise.all([
      DailyStatModel.find({ userId: user._id, day: trusted({ $gte: first }) }).lean<DailyStatDoc[]>(),
      this.goalFor(user, now),
      testDateFor(user, today),
      analyticsService.predictedTotal(String(user._id)),
      ensureFriendCode(user),
      MistakeModel.countDocuments({ userId: user._id, fixedAt: null, dueAt: trusted({ $lte: now }) }),
    ]);
    const byDay = new Map(stats.map((stat) => [stat.day, stat]));
    const todayStat = byDay.get(today);
    const week = isoWeek(today);
    const weekPoints = await DailyStatModel.aggregate<{ points: number }>([
      { $match: { userId: user._id, week } },
      { $group: { _id: null, points: { $sum: "$points" } } },
    ]);
    const progress = goal.type === "questions" ? (todayStat?.questions ?? 0) : Math.floor((todayStat?.seconds ?? 0) / 60);
    const days = Array.from({ length: 14 }, (_, index) => {
      const day = addDays(first, index);
      const stat = byDay.get(day);
      return { day, questions: stat?.questions ?? 0, minutes: Math.floor((stat?.seconds ?? 0) / 60), points: stat?.points ?? 0, met: stat?.goalMet ?? false };
    });
    return {
      settings: settingsView(user),
      goal: { ...goal, progress, met: (todayStat?.goalMet ?? false) || progress >= goal.amount },
      streak: streakView(user, today),
      points: { today: todayStat?.points ?? 0, week: weekPoints[0]?.points ?? 0, total: user.totalPoints ?? 0, dailyCap: POINTS.dailyCap },
      days,
      test: { date: test.date, daysLeft: test.date ? daysBetween(today, test.date) : null, fromSettings: test.fromSettings },
      predicted: prediction,
      friendCode,
      mistakesDue,
    };
  },

  async updateSettings(user: UserDoc, input: EngagementSettingsInput): Promise<EngagementSettings> {
    const today = dayIn(new Date(), timeZoneOf(user));
    if (input.testDate && input.testDate < today) throw AppError.badRequest("Choose a test date that is still to come");
    const set: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) set[`engagement.${key}`] = value;
    }
    if (Object.keys(set).length === 0) return settingsView(user);
    // Older accounts have no engagement object yet: create it with the defaults first.
    if (!user.engagement) await UserModel.updateOne({ _id: user._id, engagement: null }, { $set: { engagement: DEFAULT_ENGAGEMENT } });
    const updated = await UserModel.findByIdAndUpdate(user._id, { $set: set }, { new: true }).lean<UserDoc>();
    return settingsView(updated!);
  },

  async leaderboard(user: UserDoc, scope: LeaderboardScope, period: LeaderboardPeriod, now = new Date()): Promise<Leaderboard> {
    const friends = await UserModel.find({ _id: trusted({ $in: user.friends ?? [] }) }).select("name").lean<UserDoc[]>();
    const friendList = friends.map((friend) => ({ id: String(friend._id), name: publicName(friend.name) }));
    const scopeFilter: Record<string, unknown> =
      scope === "friends" ? { _id: trusted({ $in: [user._id, ...(user.friends ?? [])] }) } : scope === "country" ? { country: user.country ?? "__none__" } : {};
    const today = dayIn(now, timeZoneOf(user));

    // Every student on the board with their points for the period, best first.
    let ranked: { user: UserDoc; points: number }[];
    if (period === "all") {
      const users = await UserModel.find({ ...onBoard(), ...scopeFilter, totalPoints: trusted({ $gt: 0 }) })
        .sort({ totalPoints: -1, _id: 1 })
        .limit(1000)
        .select("name country streak totalPoints engagement role plan planExpiresAt region")
        .lean<UserDoc[]>();
      ranked = users.map((entry) => ({ user: entry, points: entry.totalPoints ?? 0 }));
    } else {
      // Aggregation pipelines are not sanitized: every value here is from the server.
      const match: Record<string, unknown> = { "u.role": "student", "u.status": "active", "u.hidden": { $ne: true }, "u.engagement.showOnLeaderboard": { $ne: false } };
      if (scope === "country") match["u.country"] = user.country ?? "__none__";
      if (scope === "friends") match["u._id"] = { $in: [user._id, ...(user.friends ?? [])] };
      const rows = await DailyStatModel.aggregate<{ _id: mongoose.Types.ObjectId; points: number; u: UserDoc }>([
        { $match: { week: isoWeek(today), points: { $gt: 0 } } },
        { $group: { _id: "$userId", points: { $sum: "$points" } } },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "u" } },
        { $unwind: "$u" },
        { $match: match },
        { $sort: { points: -1, _id: 1 } },
        { $limit: 1000 },
      ]);
      ranked = rows.map((row) => ({ user: row.u, points: row.points }));
    }

    const toRow = (entry: { user: UserDoc; points: number }, index: number): LeaderboardRow => ({
      rank: index + 1,
      name: publicName(entry.user.name),
      country: entry.user.country ?? null,
      points: entry.points,
      streak: streakOn(streakOf(entry.user), dayIn(now, timeZoneOf(entry.user)), freezesPerMonth(entry.user)).current,
      me: String(entry.user._id) === String(user._id),
    });
    const rows = ranked.slice(0, 50).map(toRow);
    const myIndex = ranked.findIndex((entry) => String(entry.user._id) === String(user._id));
    return { scope, period, rows, me: myIndex >= 50 ? toRow(ranked[myIndex]!, myIndex) : null, friends: friendList };
  },

  async addFriend(user: UserDoc, code: string): Promise<{ name: string }> {
    const friend = await UserModel.findOne({ friendCode: code, role: "student", status: "active", hidden: trusted({ $ne: true }) }).lean<UserDoc>();
    if (!friend) throw AppError.notFound("No student has that friend code");
    if (String(friend._id) === String(user._id)) throw AppError.badRequest("That is your own friend code");
    if ((user.friends ?? []).length >= 200) throw AppError.conflict("You can have up to 200 friends");
    // Friendship goes both ways: each sees the other on the Friends board.
    await UserModel.updateOne({ _id: user._id }, { $addToSet: { friends: friend._id } });
    await UserModel.updateOne({ _id: friend._id }, { $addToSet: { friends: user._id } });
    return { name: publicName(friend.name) };
  },

  async removeFriend(user: UserDoc, friendId: string): Promise<void> {
    const id = new mongoose.Types.ObjectId(friendId);
    await UserModel.updateOne({ _id: user._id }, { $pull: { friends: id } });
    await UserModel.updateOne({ _id: id }, { $pull: { friends: user._id } });
  },

  // First and best full-test totals: the student's real improvement, nothing invented.
  async shareCard(user: UserDoc, now = new Date()): Promise<ShareCard> {
    const tests = await FullTestModel.find({ userId: user._id, totalScore: trusted({ $ne: null }) })
      .sort({ completedAt: 1 })
      .select("totalScore completedAt")
      .lean<FullTestDoc[]>();
    const scores = tests.map((test) => test.totalScore!).filter((score) => typeof score === "number");
    return {
      name: publicName(user.name),
      first: scores[0] ?? null,
      best: scores.length ? Math.max(...scores) : null,
      tests: scores.length,
      streak: streakOn(streakOf(user), dayIn(now, timeZoneOf(user)), freezesPerMonth(user)).current,
    };
  },
};
