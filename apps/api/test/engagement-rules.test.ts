import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_ACCESS, POINTS } from "@satsharks/types";
import { accessSettingsSchema } from "@satsharks/validation";
import {
  addDays,
  afterCorrect,
  afterWrong,
  applyDailyCap,
  classifyError,
  dayIn,
  daysBetween,
  emptyStreak,
  isoWeek,
  isRushed,
  localClock,
  onGoalMet,
  pointsFor,
  predictScore,
  pointsToGain,
  streakOn,
  suggestGoal,
  trapAnswerOf,
} from "../src/services/engagement-rules";

const DAY = 86_400_000;

test("days and weeks follow the student's time zone", () => {
  // 20:30 UTC on 13 Oct is already 14 Oct in Karachi (UTC+5), still 13 Oct in New York.
  const moment = new Date("2026-10-13T20:30:00Z");
  assert.equal(dayIn(moment, "Asia/Karachi"), "2026-10-14");
  assert.equal(dayIn(moment, "America/New_York"), "2026-10-13");
  assert.equal(dayIn(moment, "Not/AZone"), "2026-10-14"); // unknown zone falls back to Karachi
  assert.deepEqual(localClock(moment, "Asia/Karachi"), { hour: 1, weekday: 3 });
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(daysBetween("2026-10-14", "2026-11-07"), 24);
  assert.equal(isoWeek("2026-10-12"), "2026-W42"); // Monday
  assert.equal(isoWeek("2026-10-18"), "2026-W42"); // Sunday, same week
  assert.equal(isoWeek("2027-01-01"), "2026-W53");
});

test("points: nothing for blanks or answers too fast to read; a cap per day", () => {
  assert.equal(pointsFor({ section: "math", correct: true, seconds: 40, difficulty: "easy" }), POINTS.correct);
  assert.equal(pointsFor({ section: "math", correct: true, seconds: 40, difficulty: "hard" }), POINTS.correct + POINTS.hardBonus);
  assert.equal(pointsFor({ section: "math", correct: false, seconds: 40, difficulty: null }), POINTS.wrongWithEffort);
  assert.equal(pointsFor({ section: "math", correct: true, seconds: 3, difficulty: null }), 0);
  assert.equal(pointsFor({ section: "reading_writing", correct: true, seconds: 9, difficulty: null }), 0);
  assert.equal(pointsFor({ section: "math", correct: null, seconds: 60, difficulty: null }), 0);
  assert.deepEqual(applyDailyCap([10, 10, 10], 280), [10, 10, 0]);
  assert.deepEqual(applyDailyCap([15], 290), [10]);
});

test("random clicking through a set earns nothing", () => {
  const fast = Array.from({ length: 6 }, () => ({ section: "math" as const, seconds: 2 }));
  const slow = Array.from({ length: 6 }, () => ({ section: "math" as const, seconds: 50 }));
  assert.equal(isRushed([...fast.slice(0, 3), ...slow.slice(0, 3)]), true);
  assert.equal(isRushed([...fast.slice(0, 2), ...slow]), false);
  assert.equal(isRushed(fast.slice(0, 4)), false); // too few to judge
});

test("retry queue: 1, 3, 7, 16 days until answered correctly", () => {
  const now = new Date("2026-10-14T10:00:00Z");
  let state = afterWrong(null, now);
  assert.equal(state.step, 0);
  assert.equal(state.dueAt!.getTime() - now.getTime(), 1 * DAY);
  state = afterWrong(state, now);
  assert.equal(state.dueAt!.getTime() - now.getTime(), 3 * DAY);
  state = afterWrong(state, now);
  assert.equal(state.dueAt!.getTime() - now.getTime(), 7 * DAY);
  state = afterWrong(state, now);
  assert.equal(state.dueAt!.getTime() - now.getTime(), 16 * DAY);
  state = afterWrong(state, now); // stays at 16 days
  assert.equal(state.dueAt!.getTime() - now.getTime(), 16 * DAY);
  const fixed = afterCorrect(state, now);
  assert.equal(fixed.fixedAt, now);
  assert.equal(fixed.dueAt, null);
  // Wrong again later: back to the start.
  assert.equal(afterWrong(fixed, now).step, 0);
});

test("streak grows on consecutive goal days and badges at 7, 30, 100", () => {
  const now = new Date();
  let state = emptyStreak();
  for (let i = 0; i < 7; i += 1) state = onGoalMet(state, addDays("2026-10-01", i), 1, now).state;
  assert.equal(state.current, 7);
  assert.deepEqual(
    state.badges.map((badge) => badge.days),
    [7],
  );
  // Same day again changes nothing.
  assert.equal(onGoalMet(state, "2026-10-07", 1, now).state.current, 7);
});

test("a missed day uses a streak freeze; without one the streak restarts", () => {
  const now = new Date();
  let state = onGoalMet(emptyStreak(), "2026-10-01", 1, now).state;
  state = onGoalMet(state, "2026-10-02", 1, now).state;
  // 3 Oct missed, 4 Oct met: the one free freeze covers it.
  state = onGoalMet(state, "2026-10-04", 1, now).state;
  assert.equal(state.current, 3);
  assert.deepEqual(state.freezeDays, ["2026-10-03"]);
  // Another missed day in October: no freeze left, so a new streak.
  state = onGoalMet(state, "2026-10-06", 1, now).state;
  assert.equal(state.current, 1);
  assert.equal(state.longest, 3);
  // Paid accounts have 3 a month: two missed days are covered.
  const paid = onGoalMet(onGoalMet(emptyStreak(), "2026-11-01", 3, now).state, "2026-11-04", 3, now).state;
  assert.equal(paid.current, 2);
});

test("the streak as shown today", () => {
  const now = new Date();
  const state = onGoalMet(onGoalMet(emptyStreak(), "2026-10-10", 1, now).state, "2026-10-11", 1, now).state;
  assert.deepEqual(streakOn(state, "2026-10-11", 1), { current: 2, today: true, atRisk: false, freezesLeft: 1 });
  assert.deepEqual(streakOn(state, "2026-10-12", 1), { current: 2, today: false, atRisk: true, freezesLeft: 1 });
  // One missed day can still be frozen; two cannot.
  assert.equal(streakOn(state, "2026-10-13", 1).current, 2);
  assert.equal(streakOn(state, "2026-10-14", 1).current, 0);
});

test("the daily goal is suggested from the gap and the days left", () => {
  assert.equal(suggestGoal("questions", null, 30).amount, 20);
  assert.equal(suggestGoal("questions", 200, 60).amount, 55);
  assert.equal(suggestGoal("questions", 600, 5).amount, 80); // capped
  assert.equal(suggestGoal("questions", -20, 30).amount, 15);
  assert.equal(suggestGoal("minutes", 200, 60).amount, 70);
});

test("predicted score: weighted to recent tests, never more than 50 points per update", () => {
  const at = (day: number) => new Date(Date.UTC(2026, 9, day));
  const result = predictScore([
    { date: at(1), section: "reading_writing", score: 600 },
    { date: at(1), section: "math", score: 600 },
    { date: at(5), section: "math", score: 780 },
    { date: at(9), section: "reading_writing", score: 450 },
  ]);
  assert.deepEqual(
    result.trend.map((point) => point.score),
    // 1320 after the 780 is held to 1250 (+50); then (600 + 2×450)/3 + 720 = 1220.
    [1200, 1250, 1220],
  );
  for (let i = 1; i < result.trend.length; i += 1) assert.ok(Math.abs(result.trend[i]!.score - result.trend[i - 1]!.score) <= 50);
  assert.equal(result.total, 1220);
  assert.ok(result.low! < 1220 && result.high! > 1220);
  // One section only: no total yet.
  const half = predictScore([{ date: at(1), section: "math", score: 620 }]);
  assert.equal(half.total, null);
  assert.equal(half.sections.math, 620);
});

test("error patterns and trap answers", () => {
  const base = { answer: "B", timedOut: false, changedFromCorrect: false, skillAccuracy: 0.8, trapAnswer: null };
  assert.equal(classifyError({ ...base, correct: true }), null);
  assert.equal(classifyError({ ...base, correct: null, answer: null }), null);
  assert.equal(classifyError({ ...base, correct: null, answer: null, timedOut: true }), "out_of_time");
  assert.equal(classifyError({ ...base, correct: false, changedFromCorrect: true }), "changed_answer");
  assert.equal(classifyError({ ...base, correct: false, trapAnswer: "B" }), "trap");
  assert.equal(classifyError({ ...base, correct: false, skillAccuracy: 0.4 }), "not_known");
  assert.equal(classifyError({ ...base, correct: false }), "careless");
  assert.equal(trapAnswerOf({ A: 4, C: 1 }), "A");
  assert.equal(trapAnswerOf({ A: 2, C: 2 }), null); // too few answers
  assert.equal(trapAnswerOf({ A: 3, B: 3, C: 3, D: 3 }), null); // no clear favourite
  assert.equal(pointsToGain(0.5, 0.1), 30);
});

test("access settings saved before analytics existed keep their choices", () => {
  const old = { features: { drills: "paid", mocks: "free", full_tests: "paid" }, content: [], newContent: "paid" };
  const parsed = accessSettingsSchema.safeParse(old);
  assert.ok(parsed.success);
  assert.equal(parsed.data.features.drills, "paid");
  assert.equal(parsed.data.features.analytics, "free");
  assert.equal(DEFAULT_ACCESS.features.analytics, "free");
});
