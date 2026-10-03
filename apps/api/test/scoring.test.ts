import assert from "node:assert/strict";
import { test } from "node:test";
import { regionForCountry } from "@satsharks/types";
import { conversionTablesSchema, registerSchema, resetPasswordSchema } from "@satsharks/validation";
import { emptyConversionTables, sectionScore, totalScore } from "../src/services/scoring";

// A made-up, rising table: 200 at 0 correct, +10 per correct answer, capped at 800.
const rising = (questions: number) => Array.from({ length: questions + 1 }, (_, n) => Math.min(800, 200 + n * 10));

function tables() {
  const value = emptyConversionTables();
  value.math.m2_hard = rising(44).map((score) => Math.min(800, score + 40));
  value.math.m2_easy = rising(44);
  return value;
}

test("section score is read from the table for the route taken", () => {
  assert.equal(sectionScore(tables(), "math", "m2_easy", 30, 44), 500);
  assert.equal(sectionScore(tables(), "math", "m2_hard", 30, 44), 540);
});

test("no table, an unfinished section or a short attempt gives no score", () => {
  assert.equal(sectionScore(tables(), "reading_writing", "m2_hard", 30, 54), null);
  assert.equal(sectionScore(tables(), "math", "m1", 10, 22), null);
  assert.equal(sectionScore(tables(), "math", null, 10, 44), null);
  assert.equal(sectionScore(tables(), "math", "m2_easy", 10, 40), null);
});

test("raw counts outside the table are clamped to its ends", () => {
  assert.equal(sectionScore(tables(), "math", "m2_easy", -3, 44), 200);
  assert.equal(sectionScore(tables(), "math", "m2_easy", 99, 44), 640);
});

test("total is the sum of both sections, only when both exist", () => {
  assert.equal(totalScore(650, 720), 1370);
  assert.equal(totalScore(650, null), null);
  assert.equal(totalScore(null, null), null);
});

test("conversion tables: right length, 200–800, steps of 10, never decreasing", () => {
  const ok = { reading_writing: { m2_easy: rising(54), m2_hard: null }, math: { m2_easy: null, m2_hard: rising(44) } };
  assert.equal(conversionTablesSchema.safeParse(ok).success, true);

  const tooShort = { ...ok, math: { m2_easy: null, m2_hard: rising(43) } };
  assert.equal(conversionTablesSchema.safeParse(tooShort).success, false);

  const decreasing = rising(44);
  decreasing[10] = 200;
  assert.equal(conversionTablesSchema.safeParse({ ...ok, math: { m2_easy: null, m2_hard: decreasing } }).success, false);

  const offStep = rising(44);
  offStep[44] = 795;
  assert.equal(conversionTablesSchema.safeParse({ ...ok, math: { m2_easy: null, m2_hard: offStep } }).success, false);

  const outOfRange = rising(44);
  outOfRange[44] = 810;
  assert.equal(conversionTablesSchema.safeParse({ ...ok, math: { m2_easy: null, m2_hard: outOfRange } }).success, false);
});

test("Pakistan is local, every other country is international", () => {
  assert.equal(regionForCountry("PK"), "local");
  assert.equal(regionForCountry("US"), "international");
  assert.equal(regionForCountry("AE"), "international");
});

test("sign-up needs a real country code", () => {
  const base = { name: "Test Student", email: "a@example.com", password: "long-enough" };
  assert.equal(registerSchema.safeParse({ ...base, country: "pk" }).data?.country, "PK");
  assert.equal(registerSchema.safeParse({ ...base, country: "XX" }).success, false);
  assert.equal(registerSchema.safeParse(base).success, false);
});

test("reset tokens must have the generated shape", () => {
  const token = "a".repeat(43);
  assert.equal(resetPasswordSchema.safeParse({ token, password: "long-enough" }).success, true);
  assert.equal(resetPasswordSchema.safeParse({ token: "short", password: "long-enough" }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ token: `${"a".repeat(42)}$`, password: "long-enough" }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ token, password: "short" }).success, false);
});
