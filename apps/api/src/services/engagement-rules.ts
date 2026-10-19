// The rules behind Week 3 (history, mistake bank, analytics, goals, streaks, points), kept free of
// database access so they can be tested on their own. Days are "YYYY-MM-DD" strings in the
// student's own time zone.
import {
  ERROR_PATTERNS,
  MIN_SECONDS_FOR_POINTS,
  POINTS,
  RETRY_INTERVAL_DAYS,
  SECTION_SCORE_MAX,
  SECTION_SCORE_MIN,
  STREAK_MILESTONES,
  type Difficulty,
  type ErrorPattern,
  type GoalType,
  type Section,
} from "@satsharks/types";

const DAY_MS = 86_400_000;
export const DEFAULT_TIME_ZONE = "Asia/Karachi";

// ---------- days and weeks ----------

export function safeTimeZone(zone: string | null | undefined): string {
  if (!zone) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function parts(date: Date, timeZone: string): Record<string, string> {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);
  return Object.fromEntries(formatted.map((part) => [part.type, part.value]));
}

// The calendar day `date` falls on in `timeZone`.
export function dayIn(date: Date, timeZone: string): string {
  const p = parts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

// Local hour (0–23) and weekday (0 = Sunday) in `timeZone`.
export function localClock(date: Date, timeZone: string): { hour: number; weekday: number } {
  const p = parts(date, timeZone);
  return { hour: Number(p.hour) % 24, weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday ?? "Sun") };
}

const dayToUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);

// How far `timeZone` is ahead of UTC at `date`, in milliseconds.
function zoneOffset(date: Date, timeZone: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: safeTimeZone(timeZone),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// The moment the local day of `date` began in `timeZone` (e.g. the free daily drill limit).
export function startOfLocalDay(date: Date, timeZone: string): Date {
  const midnightAsUtc = dayToUtc(dayIn(date, timeZone));
  // The offset at midnight itself (it can differ from now on a daylight-saving day).
  const guess = midnightAsUtc - zoneOffset(date, timeZone);
  return new Date(midnightAsUtc - zoneOffset(new Date(guess), timeZone));
}

export function addDays(day: string, days: number): string {
  return new Date(dayToUtc(day) + days * DAY_MS).toISOString().slice(0, 10);
}

// Whole days from `from` to `to` (negative when `to` is earlier).
export function daysBetween(from: string, to: string): number {
  return Math.round((dayToUtc(to) - dayToUtc(from)) / DAY_MS);
}

// ISO 8601 week, e.g. "2026-W42" (weeks start on Monday; week 1 holds the year's first Thursday).
export function isoWeek(day: string): string {
  const date = new Date(dayToUtc(day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ---------- points ----------

export interface PointInput {
  section: Section;
  correct: boolean | null;
  seconds: number;
  difficulty: Difficulty | null;
}

// Points for one answer. Blank, or answered faster than anyone could read the question: nothing.
export function pointsFor(input: PointInput): number {
  if (input.correct === null) return 0;
  if (input.seconds < MIN_SECONDS_FOR_POINTS[input.section]) return 0;
  if (!input.correct) return POINTS.wrongWithEffort;
  return POINTS.correct + (input.difficulty === "hard" ? POINTS.hardBonus : 0);
}

// Random clicking through a set: when at least half of 5+ answers were too fast, none of them count.
export function isRushed(answers: Pick<PointInput, "section" | "seconds">[]): boolean {
  if (answers.length < 5) return false;
  const fast = answers.filter((answer) => answer.seconds < MIN_SECONDS_FOR_POINTS[answer.section]).length;
  return fast * 2 >= answers.length;
}

// Shares out `wanted` points per answer in order until the day's cap is reached.
export function applyDailyCap(wanted: number[], alreadyToday: number, cap: number = POINTS.dailyCap): number[] {
  let room = Math.max(0, cap - alreadyToday);
  return wanted.map((points) => {
    const given = Math.min(points, room);
    room -= given;
    return given;
  });
}

// ---------- retry queue ----------

export interface RetryState {
  step: number;
  dueAt: Date | null;
  fixedAt: Date | null;
}

// After a wrong answer: a new or fixed mistake waits 1 day; an open one moves to the next wait
// (3, 7, then 16 days, and stays at 16 until it is answered correctly).
export function afterWrong(existing: RetryState | null, now: Date): RetryState {
  const step = !existing || existing.fixedAt ? 0 : Math.min(existing.step + 1, RETRY_INTERVAL_DAYS.length - 1);
  return { step, dueAt: new Date(now.getTime() + RETRY_INTERVAL_DAYS[step]! * DAY_MS), fixedAt: null };
}

export function afterCorrect(existing: RetryState, now: Date): RetryState {
  return existing.fixedAt ? existing : { ...existing, dueAt: null, fixedAt: now };
}

// ---------- streaks ----------

export interface StreakState {
  current: number;
  longest: number;
  lastDay: string | null;
  freezeDays: string[];
  badges: { days: number; earnedAt: Date }[];
}

export const emptyStreak = (): StreakState => ({ current: 0, longest: 0, lastDay: null, freezeDays: [], badges: [] });

const monthOf = (day: string) => day.slice(0, 7);
const freezesUsedIn = (freezeDays: string[], month: string) => freezeDays.filter((day) => monthOf(day) === month).length;

// Missed days between the last goal day and `day` that freezes can cover (each month has its own
// allowance). null = not enough freezes, so the streak is broken.
function coverMissed(state: StreakState, day: string, perMonth: number): string[] | null {
  if (!state.lastDay) return [];
  const missed: string[] = [];
  for (let d = addDays(state.lastDay, 1); d < day; d = addDays(d, 1)) missed.push(d);
  if (missed.length > 31) return null;
  const used = new Map<string, number>();
  for (const d of missed) {
    const month = monthOf(d);
    const count = (used.get(month) ?? freezesUsedIn(state.freezeDays, month)) + 1;
    if (count > perMonth) return null;
    used.set(month, count);
  }
  return missed;
}

// The daily goal was met on `day`: the streak grows, using freezes for missed days when it can.
export function onGoalMet(state: StreakState, day: string, perMonth: number, now: Date): { state: StreakState; newBadges: number[] } {
  if (state.lastDay && day <= state.lastDay) return { state, newBadges: [] };
  const covered = coverMissed(state, day, perMonth);
  const current = covered === null || !state.lastDay ? 1 : state.current + 1;
  const freezeDays = [...state.freezeDays, ...(covered ?? [])].slice(-60);
  const earned = new Set(state.badges.map((badge) => badge.days));
  const newBadges = STREAK_MILESTONES.filter((days) => current >= days && !earned.has(days));
  return {
    state: {
      current,
      longest: Math.max(state.longest, current),
      lastDay: day,
      freezeDays,
      badges: [...state.badges, ...newBadges.map((days) => ({ days, earnedAt: now }))],
    },
    newBadges: [...newBadges],
  };
}

// The streak as it stands on `today` (before today's goal is met, if it is not yet).
export function streakOn(state: StreakState, today: string, perMonth: number): { current: number; today: boolean; atRisk: boolean; freezesLeft: number } {
  const freezesLeft = Math.max(0, perMonth - freezesUsedIn(state.freezeDays, monthOf(today)));
  if (!state.lastDay || state.current === 0) return { current: 0, today: false, atRisk: false, freezesLeft };
  if (state.lastDay >= today) return { current: state.current, today: true, atRisk: false, freezesLeft };
  // Still alive if the days missed before today can be frozen.
  const alive = coverMissed(state, today, perMonth) !== null;
  return { current: alive ? state.current : 0, today: false, atRisk: alive, freezesLeft };
}

// ---------- daily goal ----------

const roundTo5 = (value: number) => Math.round(value / 5) * 5;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

// Suggested from the points still needed and the days left: 20 questions a day at rest, plus about
// 10 questions a day for every point a day the student must gain.
export function suggestGoal(type: GoalType, gap: number | null, daysLeft: number | null): { amount: number; reason: string } {
  let questions = 20;
  let reason = "A steady 20 questions a day.";
  if (gap !== null && gap > 0 && daysLeft !== null && daysLeft > 0) {
    questions = clamp(roundTo5(20 + (gap / daysLeft) * 10), 15, 80);
    reason = `${gap} points to your target in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`;
  } else if (gap !== null && gap <= 0) {
    questions = 15;
    reason = "You are at your target: keep it there.";
  } else if (gap === null) {
    reason = "Set a target score and finish a full test for a personal goal.";
  }
  if (type === "questions") return { amount: questions, reason };
  // About 75 seconds a question (the two sections' official pace, averaged).
  return { amount: clamp(roundTo5(questions * 1.25), 15, 120), reason };
}

// ---------- predicted score ----------

export interface SectionScoreEvent {
  date: Date;
  section: Section;
  score: number;
}

const round10 = (value: number) => Math.round(value / 10) * 10;
const RECENT = 5;
export const MAX_PREDICTION_STEP = 50;

function weightedRecent(scores: number[]): number {
  const recent = scores.slice(-RECENT);
  const weights = recent.map((_, index) => index + 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return recent.reduce((sum, score, index) => sum + score * weights[index]!, 0) / total;
}

// Each section: a weighted average of its last 5 scores (newest counts most). The total moves at most
// 50 points per new score, so one unusual test never swings it. The range narrows as scores add up.
export function predictScore(events: SectionScoreEvent[]): {
  total: number | null;
  low: number | null;
  high: number | null;
  sections: Record<Section, number | null>;
  trend: { date: string; score: number }[];
} {
  const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  const seen: Record<Section, number[]> = { reading_writing: [], math: [] };
  const trend: { date: string; score: number }[] = [];
  let shown: number | null = null;
  for (const event of sorted) {
    seen[event.section].push(event.score);
    if (seen.reading_writing.length === 0 || seen.math.length === 0) continue;
    const raw = weightedRecent(seen.reading_writing) + weightedRecent(seen.math);
    const next: number = shown === null ? raw : clamp(raw, shown - MAX_PREDICTION_STEP, shown + MAX_PREDICTION_STEP);
    shown = clamp(round10(next), SECTION_SCORE_MIN * 2, SECTION_SCORE_MAX * 2);
    trend.push({ date: event.date.toISOString(), score: shown });
  }
  const sections = {
    reading_writing: seen.reading_writing.length ? round10(weightedRecent(seen.reading_writing)) : null,
    math: seen.math.length ? round10(weightedRecent(seen.math)) : null,
  };
  if (shown === null) return { total: null, low: null, high: null, sections, trend };
  const half = clamp(round10(120 / Math.sqrt(sorted.length)), 30, 100);
  return { total: shown, low: Math.max(SECTION_SCORE_MIN * 2, shown - half), high: Math.min(SECTION_SCORE_MAX * 2, shown + half), sections, trend };
}

// ---------- skills and errors ----------

// Scaled points gained on a real test by answering this skill right: its share of the section's
// questions × the 600 points a section spans, scaled by how often it is missed now.
export function pointsToGain(accuracy: number, shareOfSection: number): number {
  return Math.round((1 - accuracy) * shareOfSection * (SECTION_SCORE_MAX - SECTION_SCORE_MIN));
}

export interface ErrorInput {
  correct: boolean | null;
  answer: string | null;
  timedOut: boolean;
  changedFromCorrect: boolean;
  // The student's accuracy on this question's skill (0–1); null = unknown.
  skillAccuracy: number | null;
  // The wrong answer most students choose on this question, when clear.
  trapAnswer: string | null;
}

export const NOT_KNOWN_BELOW = 0.6;

// Why a question was missed. null = not a mistake (right, or skipped in an untimed set).
export function classifyError(input: ErrorInput): ErrorPattern | null {
  if (input.correct === true) return null;
  if (input.correct === null) return input.timedOut ? "out_of_time" : null;
  if (input.changedFromCorrect) return "changed_answer";
  if (input.trapAnswer !== null && input.answer === input.trapAnswer) return "trap";
  if (input.skillAccuracy !== null && input.skillAccuracy < NOT_KNOWN_BELOW) return "not_known";
  return "careless";
}

export const errorPatterns = ERROR_PATTERNS;

// A trap answer: at least 5 wrong answers to the question and one choice taken by at least 40% of them.
export function trapAnswerOf(wrongAnswers: Record<string, number>): string | null {
  const total = Object.values(wrongAnswers).reduce((sum, count) => sum + count, 0);
  if (total < 5) return null;
  const [answer, count] = Object.entries(wrongAnswers).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  return answer !== null && count / total >= 0.4 ? answer : null;
}
