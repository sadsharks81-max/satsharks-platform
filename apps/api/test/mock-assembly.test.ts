import assert from "node:assert/strict";
import { test } from "node:test";
import { orderModule, pickModule, requiredForHard, type Candidate } from "../src/services/mock-assembly";

// Deterministic "random" so tests are repeatable.
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

const SKILLS = Array.from({ length: 10 }, (_, i) => `skill-${i}`);
// 10 skills x 6 questions: 2 easy, 2 hard, 2 unlabelled each.
const pool: Candidate[] = SKILLS.flatMap((skill, s) =>
  ["easy", "easy", "hard", "hard", null, null].map((difficulty, i) => ({
    id: `${s}-${i}`,
    skill,
    topic: `topic-${s % 4}`,
    difficulty: difficulty as Candidate["difficulty"],
  })),
);

test("a module is spread across every skill before any skill repeats", () => {
  const module = pickModule(pool, 22, "m1", new Set(), seeded(1));
  assert.equal(module.length, 22);
  const perSkill = SKILLS.map((skill) => module.filter((q) => q.skill === skill).length);
  // 22 over 10 skills: every skill twice, two skills three times.
  assert.ok(perSkill.every((n) => n >= 2 && n <= 3), perSkill.join(","));
  assert.equal(new Set(module.map((q) => q.id)).size, 22, "no duplicates");
});

test("the harder Module 2 takes hard questions first, the easier one easy questions first", () => {
  const hard = pickModule(pool, 20, "m2_hard", new Set(), seeded(2));
  const easy = pickModule(pool, 20, "m2_easy", new Set(), seeded(3));
  assert.ok(hard.every((q) => q.difficulty === "hard"), "20 picks over 10 skills with 2 hard each: all hard");
  assert.ok(easy.every((q) => q.difficulty === "easy"));
});

test("when a preferred difficulty runs out, the module is still filled", () => {
  const hard = pickModule(pool, 40, "m2_hard", new Set(), seeded(4));
  assert.equal(hard.length, 40);
  assert.equal(hard.filter((q) => q.difficulty === "hard").length, 20);
  assert.equal(hard.filter((q) => q.difficulty === "easy").length, 0, "unlabelled before easy");
});

test("Module 2 never repeats a Module 1 question", () => {
  const one = pickModule(pool, 22, "m1", new Set(), seeded(5));
  const two = pickModule(pool, 22, "m2_hard", new Set(one.map((q) => q.id)), seeded(6));
  assert.equal(two.length, 22);
  assert.ok(two.every((q) => !one.some((o) => o.id === q.id)));
});

test("a pool smaller than the module returns what it has", () => {
  assert.equal(pickModule(pool.slice(0, 5), 22, "m1", new Set(), seeded(7)).length, 5);
});

test("Math modules run from easier to harder; Reading & Writing follows the official domain order", () => {
  const math = orderModule(pickModule(pool, 22, "m1", new Set(), seeded(8)), "math");
  const rank = (q: Candidate) => ({ easy: 0, medium: 1, hard: 2 })[q.difficulty ?? "medium"];
  assert.ok(math.every((q, i) => i === 0 || rank(math[i - 1]!) <= rank(q)));

  const domains = ["Expression of Ideas", "Craft and Structure", "Standard English Conventions", "Information and Ideas"];
  const rw = orderModule(
    domains.map((topic, i) => ({ id: String(i), skill: null, topic, difficulty: null })),
    "reading_writing",
  );
  assert.deepEqual(rw.map((q) => q.topic), ["Craft and Structure", "Information and Ideas", "Standard English Conventions", "Expression of Ideas"]);
});

test("routing threshold: 65% means 15 of 22 and 18 of 27", () => {
  assert.equal(requiredForHard(22, 65), 15);
  assert.equal(requiredForHard(27, 65), 18);
  assert.equal(requiredForHard(22, 50), 11);
  assert.equal(requiredForHard(22, 100), 22);
});
