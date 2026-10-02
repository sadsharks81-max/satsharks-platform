// Exercises the question-bank collector against a fake source. No network, placeholder content.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { normalizeBluecornBank } from "../src/scrapers/normalizers/bluecorn-bank.normalizer";
import { SourceAuthError, tokenExpiry, type Rpc } from "../src/scrapers/source/bluecorn/api-client";
import { collectBank } from "../src/scrapers/source/bluecorn/bank";
import { validateImport } from "../src/scrapers/validators/import.validator";

const IDS = [105, 101, 104, 102, 103];
const DOMAINS: Record<string, number[]> = { Algebra: [101, 102, 103], "Advanced Math": [104, 105] };
const SKILLS: Record<string, number[]> = { "Linear functions": [101, 102], "Nonlinear functions": [104, 105] };
const DIFFICULTY: Record<string, number[]> = { easy: [101], hard: [104, 105] };

function fakeSource(options: { failOn?: (fn: string, count: number) => boolean } = {}) {
  const calls: string[] = [];
  const attempts = new Map<string, number[]>();
  const rpc: Rpc = async (fn, body) => {
    calls.push(fn);
    if (options.failOn?.(fn, calls.filter((name) => name === fn).length)) throw new SourceAuthError("token expired");
    switch (fn) {
      case "getQsMetadata":
        return { exams: [{ id: 22, name: "Fixture Exam", exam_date: "2026-06-06" }], math_domains: Object.keys(DOMAINS), math_skills: Object.keys(SKILLS) };
      case "getCounts":
        return [{ id: 22, name: "Fixture Exam", total: 5, rw: 0, math: 5 }];
      case "pFilter": {
        const domains = body.p_domains as string[] | null;
        const skills = body.p_skills as string[] | null;
        if (domains) return DOMAINS[domains[0]!];
        if (skills) return SKILLS[skills[0]!];
        if (body.p_difficulty) return DIFFICULTY[body.p_difficulty as string];
        return IDS;
      }
      case "pStart": {
        const id = `attempt-${attempts.size + 1}`;
        attempts.set(id, body.p_question_ids as number[]);
        return id;
      }
      case "pEnd":
        return { status: "done" };
      case "rpGetResult":
        return {
          attempt: { id: body.p_attempt_id },
          questions: attempts.get(body.p_attempt_id as string)!.map((id, index) => ({
            id: `aq-${id}`,
            question_id: id,
            content_id: String(id),
            position: index + 1,
            section: "math",
            type: "mcq",
            prompt: `FIXTURE prompt ${id}`,
            options: ["w", "x", "y", "z"].map((text) => ({ text, viz_data: null })),
            c_answer: id % 4,
            c_answers: [],
            explanation: null,
            graph_url: null,
            viz_data: null,
            passage: null,
          })),
        };
      default:
        throw new Error(`unexpected call ${fn}`);
    }
  };
  return { rpc, calls, attempts };
}

const newDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "satsharks-bank-"));
const collect = (rpc: Rpc, dir: string) => collectBank({ rpc, examId: 22, section: "math", dir, chunkSize: 2, log: () => undefined });

test("collects every question with labels taken from the filters", async () => {
  const source = fakeSource();
  const bank = await collect(source.rpc, newDir());

  assert.equal(bank.questions.size, 5);
  assert.deepEqual(bank.warnings, []);
  // 5 questions in chunks of 2 -> 3 drills, with IDs in a stable sorted order.
  assert.deepEqual([...source.attempts.values()], [[101, 102], [103, 104], [105]]);
  // 1 unfiltered + 2 domains + 2 skills + 2 difficulties.
  assert.equal(source.calls.filter((fn) => fn === "pFilter").length, 7);

  const { paper, questions, warnings } = normalizeBluecornBank(bank, "fixture");
  assert.deepEqual(validateImport(paper, questions).errors, []);
  assert.equal(paper.sourcePaperId, "exam-22-math");
  assert.equal(paper.title, "Fixture Exam — Math — question bank (5)");
  assert.equal(paper.status, "draft");
  assert.deepEqual(
    questions.map((q) => [q.sourceQuestionId, q.questionNumber, q.topic, q.skill, q.difficulty]),
    [
      ["101", 1, "Algebra", "Linear functions", "easy"],
      ["102", 2, "Algebra", "Linear functions", null],
      ["103", 3, "Algebra", null, null],
      ["104", 4, "Advanced Math", "Nonlinear functions", "hard"],
      ["105", 5, "Advanced Math", "Nonlinear functions", "hard"],
    ],
  );
  assert.deepEqual(questions[0]?.correctAnswer, { choiceKey: "B", acceptedValues: [] });
  // Question 103 has no skill at the source: reported, not invented.
  assert.deepEqual(warnings, ["1 question(s) have no skill"]);
  assert.deepEqual(paper.metadata.labelCounts, { easy: 1, hard: 2, difficultyNotStated: 2, withoutTopic: 0, withoutSkill: 1 });
});

test("a second run makes no requests", async () => {
  const dir = newDir();
  await collect(fakeSource().rpc, dir);
  const second = fakeSource();
  const bank = await collect(second.rpc, dir);

  assert.deepEqual(second.calls, []);
  assert.equal(bank.questions.size, 5);
  assert.equal(bank.stats.drillsCreated, 0);
});

test("an expired token mid-run resumes without creating a second drill for the same chunk", async () => {
  const dir = newDir();
  // The token dies on the result call of the second chunk: its drill already exists.
  const first = fakeSource({ failOn: (fn, count) => fn === "rpGetResult" && count === 2 });
  await assert.rejects(collect(first.rpc, dir), SourceAuthError);
  assert.equal(first.attempts.size, 2);

  const resumed = fakeSource();
  // The resumed source must know the interrupted drill, as the real one would.
  resumed.attempts.set("attempt-2", [103, 104]);
  const bank = await collect(resumed.rpc, dir);

  assert.equal(bank.questions.size, 5);
  // Only the last chunk needed a new drill; chunk 2 reused "attempt-2".
  assert.equal(bank.stats.drillsCreated, 1);
  assert.equal(resumed.calls.filter((fn) => fn === "pStart").length, 1);
  assert.equal(resumed.calls.filter((fn) => fn === "pFilter").length, 0);
});

test("a question matching two domains is left unlabelled and reported", async () => {
  DOMAINS["Advanced Math"]!.push(101);
  try {
    const bank = await collect(fakeSource().rpc, newDir());
    assert.equal(bank.labels.get(101)?.domain, null);
    assert.ok(bank.warnings.some((w) => w.includes("matched more than one domain")));
  } finally {
    DOMAINS["Advanced Math"]!.pop();
  }
});

test("token expiry is read from the token", () => {
  const token = `x.${Buffer.from(JSON.stringify({ exp: 1_900_000_000 })).toString("base64url")}.y`;
  assert.equal(tokenExpiry(token)?.toISOString(), "2030-03-17T17:46:40.000Z");
  assert.equal(tokenExpiry("not-a-token"), null);
});
