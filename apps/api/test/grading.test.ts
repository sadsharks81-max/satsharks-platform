import assert from "node:assert/strict";
import { test } from "node:test";
import { gradeAnswer } from "../src/utils/grading";

const mcq = (choiceKey: string) => ({ questionType: "mcq" as const, correctAnswer: { choiceKey, acceptedValues: [] } });
const spr = (...acceptedValues: string[]) => ({ questionType: "spr" as const, correctAnswer: { choiceKey: null, acceptedValues } });

test("multiple choice: only the keyed choice is correct", () => {
  assert.equal(gradeAnswer(mcq("B"), "B"), true);
  assert.equal(gradeAnswer(mcq("B"), "A"), false);
  assert.equal(gradeAnswer(mcq("B"), null), false);
});

test("a question without an answer key cannot be graded", () => {
  assert.equal(gradeAnswer({ questionType: "mcq", correctAnswer: null }, "A"), null);
});

test("typed answer: any listed value is accepted", () => {
  assert.equal(gradeAnswer(spr("55", "56", "57"), "56"), true);
  assert.equal(gradeAnswer(spr("55", "56", "57"), "58"), false);
  assert.equal(gradeAnswer(spr("13", "-5", "-1"), "-5"), true);
  assert.equal(gradeAnswer(spr("7.32"), " 7.32 "), true);
});

test("typed answer: equivalent fractions and decimals are accepted", () => {
  assert.equal(gradeAnswer(spr("13/2", "6.5"), "6.50"), true);
  assert.equal(gradeAnswer(spr("7/2"), "3.5"), true);
  assert.equal(gradeAnswer(spr("3.5"), "7/2"), true);
  assert.equal(gradeAnswer(spr("3.5"), "14/4"), true);
  assert.equal(gradeAnswer(spr("0.5"), ".5"), true);
  assert.equal(gradeAnswer(spr("3"), "3.0"), true);
});

test("typed answer: a long decimal may be truncated or rounded, but only when the box is full", () => {
  // 2/3 = 0.6666...
  assert.equal(gradeAnswer(spr("2/3"), ".6666"), true);
  assert.equal(gradeAnswer(spr("2/3"), ".6667"), true);
  assert.equal(gradeAnswer(spr("2/3"), "0.666"), true);
  assert.equal(gradeAnswer(spr("2/3"), "0.667"), true);
  // Space was left over, so more digits were required.
  assert.equal(gradeAnswer(spr("2/3"), "0.66"), false);
  assert.equal(gradeAnswer(spr("2/3"), "0.7"), false);
  // Negative answers get six characters.
  assert.equal(gradeAnswer(spr("-2/3"), "-.6666"), true);
  assert.equal(gradeAnswer(spr("-2/3"), "-.6667"), true);
  assert.equal(gradeAnswer(spr("-2/3"), "-0.66"), false);
  // 50/13 = 3.84615...
  assert.equal(gradeAnswer(spr("50/13", "3.846"), "3.846"), true);
  assert.equal(gradeAnswer(spr("50/13"), "3.85"), false);
});

test("typed answer: wrong, empty and malformed input is incorrect", () => {
  assert.equal(gradeAnswer(spr("7.32"), "30"), false);
  assert.equal(gradeAnswer(spr("7.32"), ""), false);
  assert.equal(gradeAnswer(spr("7.32"), "abc"), false);
  assert.equal(gradeAnswer(spr("4"), "4/0"), false);
  assert.equal(gradeAnswer(spr("33", "-33"), "-33"), true);
});
