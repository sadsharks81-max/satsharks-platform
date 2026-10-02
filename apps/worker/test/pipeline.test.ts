// Exercises the pipeline against a synthetic recording that follows the RPC shapes observed in
// the source app. The content is placeholder text: it is a test fixture, never imported anywhere.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { runPipeline } from "../src/services/pipeline.service";

const HOST = "api.source.test";
const ATTEMPT = "11111111-1111-4111-8111-111111111111";

function entry(fn: string, request: unknown, response: unknown, encoding?: "base64") {
  const text = JSON.stringify(response);
  return {
    startedDateTime: "2026-01-01T00:00:00.000Z",
    request: {
      method: "POST",
      url: `https://${HOST}/rest/v1/rpc/${fn}`,
      headers: [{ name: "apikey", value: "should-never-be-read" }],
      postData: { text: JSON.stringify(request) },
    },
    response: {
      status: 200,
      content: encoding ? { text: Buffer.from(text).toString("base64"), encoding } : { text },
    },
  };
}

function question(id: string, contentId: string, position: number, type: "mcq" | "grid_in") {
  return {
    id,
    content_id: contentId,
    position,
    section: "math",
    q_type: type,
    prompt: `FIXTURE prompt ${contentId}`,
    passage: null,
    image: null,
    viz_data: null,
    options: type === "mcq" ? ["w", "x", "y", "z"].map((text) => ({ text, viz_data: null })) : [],
    s_answer: null,
    flagged: false,
    image_dimensions: { maxWidth: 400 },
  };
}

function writeHar(entries: unknown[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "satsharks-test-"));
  const file = path.join(dir, "fixture.har");
  fs.writeFileSync(file, JSON.stringify({ log: { entries } }));
  return file;
}

const byAttempt = { p_attempt_id: ATTEMPT };

function fullRecording() {
  return [
    entry("getQsMetadata", {}, { exams: [{ id: "7", name: "Fixture Exam" }] }),
    entry("mStart", { p_section: "math", p_exam_ids: ["7"], p_timer: true }, ATTEMPT),
    entry("mGetAttempt", byAttempt, { attempt: { id: ATTEMPT, name: null, section: "math", count: 4, current_module: "m1", m2_type: null }, navigation: [] }),
    entry("mGet", { ...byAttempt, p_position: 1 }, question("q1", "101", 1, "mcq")),
    entry("mGet", { ...byAttempt, p_position: 2 }, question("q2", "102", 2, "grid_in"), "base64"),
    // Navigating back to question 1 fetches it again: must not create a duplicate.
    entry("mGet", { ...byAttempt, p_position: 1 }, question("q1", "101", 1, "mcq")),
    entry("mEndModule1", byAttempt, { m2_type: "m2_hard", m1_correct: 2 }),
    entry("mGetAttempt", byAttempt, { attempt: { id: ATTEMPT, section: "math", count: 4, current_module: "m2", m2_type: "m2_hard", m1_correct: 2 }, navigation: [] }),
    entry("mGet", { ...byAttempt, p_position: 1 }, question("q3", "201", 1, "mcq")),
    entry("mGet", { ...byAttempt, p_position: 2 }, question("q4", "202", 2, "mcq")),
    entry("mEnd", byAttempt, { status: "done", m2_type: "m2_hard", m1_correct: 2, m2_correct: 1 }),
    entry("mrGetResult", byAttempt, {
      attempt: { id: ATTEMPT, section: "math", count: 4, m2_type: "m2_hard", m1_correct: 2, m2_correct: 1, status: "done" },
      questions: [
        { id: "q1", module_type: "m1", position: 1, type: "mcq", c_answer: 2 },
        { id: "q2", module_type: "m1", position: 2, type: "grid_in", c_answers: ["3.5", "7/2"] },
        { id: "q3", module_type: "m2_hard", position: 1, type: "mcq", c_answer: 0 },
        { id: "q4", module_type: "m2_hard", position: 2, type: "mcq", c_answer: 3 },
      ],
    }),
  ];
}

function run(entries: unknown[]) {
  const harPath = writeHar(entries);
  return runPipeline({ harPath, sourceName: "fixture", apiHost: HOST, outputRoot: path.dirname(harPath) });
}

test("full recording: modules, answers and adaptive route are normalized", () => {
  const result = run(fullRecording());

  assert.deepEqual(result.validation.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.paper.sourcePaperId, ATTEMPT);
  assert.equal(result.paper.status, "draft");
  assert.deepEqual(result.paper.sections, ["math"]);
  assert.deepEqual(
    result.paper.modules.map((m) => [m.moduleType, m.moduleNumber, m.questionCount]),
    [["m1", 1, 2], ["m2_hard", 2, 2]],
  );
  assert.deepEqual(result.paper.adaptive, {
    isAdaptive: true,
    routing: "server_side",
    observedRoute: "m2_hard",
    module1Correct: 2,
    routingThreshold: null,
  });
  assert.deepEqual(result.paper.sourceMetadata.examNames, ["Fixture Exam"]);

  assert.equal(result.questions.length, 4);
  const [q1, q2, q3] = result.questions;
  assert.deepEqual(q1?.correctAnswer, { choiceKey: "C", acceptedValues: [] });
  assert.equal(q1?.choices.length, 4);
  assert.equal(q2?.questionType, "spr");
  assert.deepEqual(q2?.correctAnswer, { choiceKey: null, acceptedValues: ["3.5", "7/2"] });
  assert.equal(q3?.moduleType, "m2_hard");
  assert.equal(q3?.sourceQuestionId, "201");
  // Not provided by the source: must stay null, not be invented.
  assert.ok(result.questions.every((q) => q.difficulty === null && q.topic === null && q.explanation === null));
});

test("raw output keeps bodies only, and only this attempt's calls", () => {
  const result = run(fullRecording());
  const raw = fs.readFileSync(path.join(result.outputDir, "raw", "rpc-calls.json"), "utf8");
  assert.ok(!raw.includes("should-never-be-read"));
  assert.ok(!raw.includes("getQsMetadata"));
  assert.ok(fs.existsSync(path.join(result.outputDir, "normalized", "questions.json")));
  assert.ok(fs.existsSync(path.join(result.outputDir, "metadata.json")));
});

test("recording without results: modules come from call order, answers are null and reported", () => {
  const result = run(fullRecording().filter((e) => !e.request.url.endsWith("/mrGetResult")));

  assert.deepEqual(result.validation.errors, []);
  assert.deepEqual(result.questions.map((q) => q.moduleType), ["m1", "m1", "m2_hard", "m2_hard"]);
  assert.ok(result.questions.every((q) => q.correctAnswer === null));
  assert.ok(result.warnings.some((w) => w.includes("Result call not captured")));
  assert.ok(result.warnings.some((w) => w.includes("4 question(s) have no correct answer")));
});

test("recording that stops in Module 1: route is unknown, not assumed", () => {
  const entries = fullRecording().slice(0, 6);
  const result = run(entries);

  assert.equal(result.paper.adaptive.observedRoute, null);
  assert.equal(result.paper.adaptive.routing, "unknown");
  assert.equal(result.paper.adaptive.isAdaptive, false);
  assert.ok(result.questions.every((q) => q.moduleType === "unknown" && q.moduleNumber === null));
  assert.ok(result.warnings.some((w) => w.includes("Source reports 4 questions")));
});

test("a recording with no attempt is rejected with the functions that were seen", () => {
  const entries = [entry("getStatus", {}, false), entry("getCounts", {}, [])];
  assert.throws(() => run(entries), /No mock or drill attempt found.*getStatus, getCounts/s);
});

const DRILL = "44444444-4444-4444-8444-444444444444";

function drillRecording(filter: Record<string, unknown> = {}) {
  const byDrill = { p_attempt_id: DRILL };
  const resultQuestion = (id: string, contentId: string, position: number, extra: Record<string, unknown>) => ({
    ...question(id, contentId, position, "mcq"),
    q_type: undefined,
    image: undefined,
    graph_url: null,
    explanation: null,
    ...extra,
  });
  return [
    entry("getQsMetadata", {}, { exams: [{ id: 22, name: "Fixture Exam" }] }),
    entry("pFilter", { p_exam_id: 22, p_section: "math", p_domains: null, p_skills: null, p_difficulty: null, p_limit: 3, ...filter }, [501, 502, 503]),
    entry("pStart", { p_exam_id: 22, p_question_ids: [501, 502, 503], p_timer: true, p_t_time: 600, p_name: "fixture drill" }, DRILL),
    entry("pGetAttempt", byDrill, { attempt: { id: DRILL, name: "fixture drill", section: "math", count: 3, timer: true, t_time: 600, status: "active" }, navigation: [] }),
    // Only the first question is opened; the other two exist only in the result payload.
    entry("pGet", { ...byDrill, p_position: 1 }, question("d1", "501", 1, "mcq")),
    entry("pCheckQuestion", { ...byDrill, p_position: 1 }, resultQuestion("d1", "501", 1, { type: "mcq", c_answer: 1, c_answers: [] })),
    entry("pEnd", byDrill, { attempt_id: DRILL, status: "done", count: 3, correct: 0, incorrect: 1, unanswered: 2 }),
    entry("rpGetResult", byDrill, {
      attempt: { id: DRILL, name: "fixture drill", section: "math", count: 3, status: "done" },
      questions: [
        resultQuestion("d1", "501", 1, { type: "mcq", c_answer: 1, c_answers: [] }),
        resultQuestion("d2", "502", 2, { type: "grid_in", options: [], c_answer: null, c_answers: ["7.32"], graph_url: "https://cdn.source.test/a.svg" }),
        resultQuestion("d3", "503", 3, { type: "mcq", c_answer: 3, c_answers: [], explanation: "FIXTURE explanation" }),
      ],
    }),
  ];
}

test("drill recording: a flat question set with answers, no modules, no adaptive data", () => {
  const result = run(drillRecording());

  assert.deepEqual(result.validation.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.paper.sourcePaperId, DRILL);
  assert.equal(result.paper.title, "Fixture Exam — Math — question set (3)");
  assert.equal(result.paper.metadata.importKind, "drill");
  assert.deepEqual(
    result.paper.modules.map((m) => [m.moduleType, m.moduleNumber, m.questionCount]),
    [["none", null, 3]],
  );
  assert.deepEqual(result.paper.adaptive, {
    isAdaptive: false,
    routing: "unknown",
    observedRoute: null,
    module1Correct: null,
    routingThreshold: null,
  });

  const [q1, q2, q3] = result.questions;
  assert.deepEqual(q1?.correctAnswer, { choiceKey: "B", acceptedValues: [] });
  assert.deepEqual(q2?.correctAnswer, { choiceKey: null, acceptedValues: ["7.32"] });
  assert.deepEqual(q2?.assets, [{ kind: "image", url: "https://cdn.source.test/a.svg", maxWidth: 400 }]);
  assert.equal(q3?.explanation, "FIXTURE explanation");
  assert.ok(result.questions.every((q) => q.difficulty === null && q.topic === null && q.skill === null));

  const raw = fs.readFileSync(path.join(result.outputDir, "raw", "rpc-calls.json"), "utf8");
  assert.ok(raw.includes("pFilter"));
});

test("drill filtered to one domain, one skill and one difficulty labels every question with them", () => {
  const result = run(drillRecording({ p_domains: ["Algebra"], p_skills: ["Linear functions"], p_difficulty: "Hard" }));
  assert.ok(result.questions.every((q) => q.topic === "Algebra" && q.skill === "Linear functions" && q.difficulty === "hard"));
  assert.equal(result.paper.metadata.difficultyAvailable, true);
});

test("drill filtered to several domains leaves topic null", () => {
  const result = run(drillRecording({ p_domains: ["Algebra", "Advanced Math"] }));
  assert.ok(result.questions.every((q) => q.topic === null));
});

test("two mock attempts in one recording require an explicit choice", () => {
  const other = "33333333-3333-4333-8333-333333333333";
  const entries = [...fullRecording(), entry("mGet", { p_attempt_id: other, p_position: 1 }, question("z1", "301", 1, "mcq"))];
  assert.throws(() => run(entries), /contains 2 attempts/);
});
