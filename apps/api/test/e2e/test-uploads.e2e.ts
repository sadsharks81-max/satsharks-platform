// End-to-end check of uploaded practice tests against a throwaway in-memory MongoDB. Never touches
// the database in .env: MONGODB_URI is replaced before the app loads, and the run stops if it is
// not a local in-memory server.
//
//   npx tsx apps/api/test/e2e/test-uploads.e2e.ts <folder with the test PDFs>
//   npx tsx apps/api/test/e2e/test-uploads.e2e.ts <folder> --serve 4100   (seed, then keep serving)
//
// The PDFs come from make-test-pdfs.mjs in this folder.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

const folder = process.argv[2];
if (!folder) throw new Error("Pass the folder with the test PDFs");
const serveIndex = process.argv.indexOf("--serve");
const servePort = serveIndex > 0 ? Number(process.argv[serveIndex + 1] ?? 4100) : null;

const mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
const uri = mongo.getUri("satsharks-e2e");
if (!/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(uri)) throw new Error(`Refusing to run against ${uri}`);
process.env.MONGODB_URI = uri;
process.env.JWT_SECRET = "e2e-secret-that-is-long-enough-0123456789";
process.env.NODE_ENV = "test";

const { connectMongo, PaperModel, QuestionModel, TestUploadModel, UserModel, AttemptModel } = await import("@satsharks/db");
const { createApp } = await import("../../src/app");
await connectMongo(uri);
assert.equal((await import("mongoose")).default.connection.host, "127.0.0.1");

// ---------- seed: a small bank with the real domains and skills ----------
const VOCABULARY: [string, string, string][] = [
  ["math", "Algebra", "Linear equations in one variable"],
  ["math", "Algebra", "Linear functions"],
  ["math", "Algebra", "Systems of two linear equations in two variables"],
  ["math", "Advanced Math", "Equivalent expressions"],
  ["math", "Advanced Math", "Nonlinear functions"],
  ["math", "Problem-Solving and Data Analysis", "Percentages"],
  ["math", "Geometry and Trigonometry", "Circles"],
  ["math", "Geometry and Trigonometry", "Area and volume"],
  // Every Reading & Writing skill of the real bank.
  ["reading_writing", "Craft and Structure", "Words in Context"],
  ["reading_writing", "Craft and Structure", "Cross-Text Connections"],
  ["reading_writing", "Craft and Structure", "Text Structure and Purpose"],
  ["reading_writing", "Information and Ideas", "Central Ideas and Details"],
  ["reading_writing", "Information and Ideas", "Command of Evidence"],
  ["reading_writing", "Information and Ideas", "Inferences"],
  ["reading_writing", "Standard English Conventions", "Boundaries"],
  ["reading_writing", "Standard English Conventions", "Form, Structure, and Sense"],
  ["reading_writing", "Expression of Ideas", "Rhetorical Synthesis"],
  ["reading_writing", "Expression of Ideas", "Transitions"],
];
for (const section of ["math", "reading_writing"] as const) {
  const paper = await PaperModel.create({ title: `Bank exam — ${section}`, source: "bluecorn", sourcePaperId: `bank-${section}`, status: "published", sections: [section], questionCount: 64 });
  const triples = VOCABULARY.filter(([s]) => s === section);
  await QuestionModel.insertMany(
    Array.from({ length: 64 }, (_, i) => {
      const [, topic, skill] = triples[i % triples.length]!;
      return {
        paperId: paper._id, source: "bluecorn", sourceQuestionId: `${section}-${i}`, section, moduleType: "none", questionNumber: i + 1, questionType: "mcq",
        difficulty: ["easy", "medium", "hard"][i % 3], topic, skill, prompt: `Bank question ${i}`, passage: null,
        choices: ["A", "B", "C", "D"].map((key) => ({ key, text: key })), correctAnswer: { choiceKey: "A", acceptedValues: [] }, status: "published",
      };
    }),
  );
}

const server = createApp().listen(servePort ?? 0);
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

// ---------- a tiny client with a cookie per user ----------
type Json = { ok: boolean; data?: any; error?: { code: string; message: string } };
function client() {
  let cookie = "";
  async function call(method: string, path: string, body?: unknown, form?: FormData): Promise<{ status: number; json: Json }> {
    const response = await fetch(base + path, {
      method,
      headers: { ...(cookie ? { cookie } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}) },
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    const set = response.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0]!;
    return { status: response.status, json: (await response.json()) as Json };
  }
  return { call };
}
const pdf = (name: string) => new Blob([readFileSync(join(folder, name))], { type: "application/pdf" });

const admin = client();
const student = client();
await admin.call("POST", "/api/auth/register", { name: "E2E Admin", email: "phase1-test-admin@example.com", password: "password-123", country: "PK" });
await UserModel.updateOne({ email: "phase1-test-admin@example.com" }, { $set: { role: "admin" } });
await admin.call("POST", "/api/auth/login", { email: "phase1-test-admin@example.com", password: "password-123" });
await student.call("POST", "/api/auth/register", { name: "E2E Student", email: "phase1-test-student@example.com", password: "password-123", country: "PK" });

if (servePort) {
  console.log(`Serving on ${base} with ${uri}. Admin phase1-test-admin@example.com / password-123, student phase1-test-student@example.com / password-123. Ctrl+C to stop.`);
} else {
  await run();
  server.close();
  await (await import("mongoose")).default.disconnect();
  await mongo.stop();
}

async function run() {
  let passed = 0;
  const check = async (name: string, body: () => Promise<void>) => {
    await body();
    passed += 1;
    console.log(`  ok  ${name}`);
  };
  const upload = (fields: Record<string, string>, files: Record<string, string> = {}) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    for (const [key, name] of Object.entries(files)) form.append(key, pdf(name), name);
    return admin.call("POST", "/api/admin/test-uploads", undefined, form);
  };
  const replace = (id: string, section: string, name: string) => {
    const form = new FormData();
    form.append("file", pdf(name), name);
    return admin.call("POST", `/api/admin/test-uploads/${id}/sections/${section}/file`, undefined, form);
  };

  let id = "";
  await check("invalid upload input is refused", async () => {
    assert.equal((await upload({ title: "", year: "2026", testNumber: "1" }, { math: "demo-math.pdf" })).status, 400);
    assert.equal((await upload({ title: "T", year: "1999", testNumber: "1" }, { math: "demo-math.pdf" })).status, 400);
    assert.equal((await upload({ title: "T", year: "2026", testNumber: "0" }, { math: "demo-math.pdf" })).status, 400);
    const none = await upload({ title: "T", year: "2026", testNumber: "1" });
    assert.equal(none.status, 400);
    assert.match(none.json.error!.message, /Choose the English PDF/);
    assert.equal((await student.call("GET", "/api/admin/test-uploads")).status, 403);
  });

  await check("both PDFs are read during the upload with exact module counts", async () => {
    const created = await upload({ title: "E2E Practice Test 1", year: "2026", testNumber: "1" }, { readingWriting: "demo-english.pdf", math: "demo-math.pdf" });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const data = created.json.data.upload;
    id = data.id;
    assert.equal(data.readingWriting.status, "extracted", data.readingWriting.errorMessage);
    assert.equal(data.math.status, "extracted", data.math.errorMessage);
    assert.deepEqual(data.readingWriting.moduleCounts, { m1: 27, m2_easy: 27, m2_hard: 27 });
    assert.deepEqual(data.math.moduleCounts, { m1: 22, m2_easy: 22, m2_hard: 22 });
    assert.deepEqual(data.readingWriting.warnings, []);
    assert.deepEqual(data.math.warnings, []);
  });

  await check("a duplicate year and test number is refused", async () => {
    const duplicate = await upload({ title: "Again", year: "2026", testNumber: "1" }, { math: "demo-math.pdf" });
    assert.equal(duplicate.status, 409);
  });

  await check("the stored questions keep formulas, money, paragraphs and grid-in answers", async () => {
    const { json } = await admin.call("GET", `/api/admin/test-uploads/${id}`);
    const math = json.data.upload.math.questions;
    const rw = json.data.upload.readingWriting.questions;
    assert.equal(math[1].prompt.includes("$\\$"), true);
    assert.match(math[3].prompt, /\n\$\$x \+ y = \d+\$\$\n/);
    assert.equal(math[2].questionType, "spr");
    assert.deepEqual(math[2].choices, []);
    assert.equal(math[0].topic, "Algebra");
    assert.equal(math[0].skill, "Linear equations in one variable");
    assert.match(rw[1].passage, /^Text 1\n.+\nText 2\n/);
    assert.match(rw[3].passage, /\n• The Atacama/);
    assert.ok(json.data.topics.math.some((topic: { topic: string }) => topic.topic === "Geometry and Trigonometry"));
  });

  await check("a wrong or broken PDF fails with the reasons, and only that section is replaced", async () => {
    const wrong = await replace(id, "math", "demo-english.pdf");
    assert.equal(wrong.json.data.upload.math.status, "failed");
    assert.match(wrong.json.data.upload.math.errorMessage, /says SECTION: READING_WRITING, but it was uploaded as the Math file/);
    assert.equal(wrong.json.data.upload.readingWriting.status, "extracted");
    const broken = await replace(id, "math", "bad-math.pdf");
    assert.match(broken.json.data.upload.math.errorMessage, /Module 2 \(harder\) is missing/);
    const category = await replace(id, "math", "bad-category.pdf");
    assert.match(category.json.data.upload.math.errorMessage, /CATEGORY "Calculus" \(\d+ questions\) is not a domain or skill/);
    assert.match(category.json.data.upload.math.errorMessage, /cannot be displayed/);
    const money = await replace(id, "math", "bad-money.pdf");
    assert.match(money.json.data.upload.math.errorMessage, /no closing "\$"/);
    const fixed = await replace(id, "math", "demo-math.pdf");
    assert.equal(fixed.json.data.upload.math.status, "extracted");
    const notPdf = new FormData();
    notPdf.append("file", new Blob(["hello"], { type: "text/plain" }), "notes.txt");
    assert.equal((await admin.call("POST", `/api/admin/test-uploads/${id}/sections/math/file`, undefined, notPdf)).status, 400);
  });

  await check("publishing needs both sections reviewed", async () => {
    const early = await admin.call("POST", `/api/admin/test-uploads/${id}/publish`);
    assert.equal(early.status, 400);
    assert.match(early.json.error!.message, /Review and save/);
  });

  await check("review saves are validated with the same rules", async () => {
    const { json } = await admin.call("GET", `/api/admin/test-uploads/${id}`);
    for (const [section, field] of [["reading_writing", "readingWriting"], ["math", "math"]] as const) {
      const questions = json.data.upload[field].questions.map(({ questionNumber: _n, ...rest }: Record<string, unknown>) => rest);
      const bad = structuredClone(questions);
      bad[0].choiceKey = "E";
      bad[1].topic = "Not a domain";
      const refused = await admin.call("PUT", `/api/admin/test-uploads/${id}/sections/${section}`, { questions: bad });
      assert.equal(refused.status, 400);
      assert.match(refused.json.error!.message, /ANSWER must be A, B, C or D/);
      assert.match(refused.json.error!.message, /"Not a domain" is not a/);
      if (section === "math") {
        const untypeable = structuredClone(questions);
        untypeable[2].acceptedValues = ["x=1/2"];
        assert.match((await admin.call("PUT", `/api/admin/test-uploads/${id}/sections/math`, { questions: untypeable })).json.error!.message, /cannot be typed/);
        // An edit made in review.
        questions[0].explanation = `${questions[0].explanation} Check: substitute back.`;
      }
      const saved = await admin.call("PUT", `/api/admin/test-uploads/${id}/sections/${section}`, { questions });
      assert.equal(saved.status, 200, JSON.stringify(saved.json.error));
      assert.equal(saved.json.data.upload[field].status, "reviewed");
    }
  });

  let paperIds: Record<string, string> = {};
  await check("publish creates two hidden papers with tagged questions in module order", async () => {
    const published = await admin.call("POST", `/api/admin/test-uploads/${id}/publish`);
    assert.equal(published.status, 200, JSON.stringify(published.json.error));
    const data = published.json.data.upload;
    assert.equal(data.status, "published");
    assert.equal(data.active, false);
    paperIds = data.paperIds;
    const papers = await PaperModel.find({ source: "pdf-upload" }).lean();
    assert.equal(papers.length, 2);
    assert.ok(papers.every((paper) => paper.status === "hidden"));
    assert.deepEqual(papers.find((p) => p.sections[0] === "math")!.modules.map((m) => [m.moduleType, m.questionCount]), [["m1", 22], ["m2_easy", 22], ["m2_hard", 22]]);
    const questions = await QuestionModel.find({ tags: `full-test:${id}` }).select("+correctAnswer").lean();
    assert.equal(questions.length, 81 + 66);
    assert.ok(questions.every((q) => q.tags.includes("full-test") && q.status === "hidden"));
    const spr = questions.filter((q) => q.questionType === "spr");
    assert.ok(spr.length > 0 && spr.every((q) => q.choices.length === 0 && q.correctAnswer!.acceptedValues.length > 0));
    assert.equal((await admin.call("POST", `/api/admin/test-uploads/${id}/publish`)).status, 409);
    assert.equal((await replace(id, "math", "demo-math.pdf")).status, 409);
    assert.equal((await admin.call("DELETE", `/api/admin/test-uploads/${id}`)).status, 409);
  });

  await check("uploaded questions stay out of the catalog, drills, random mocks and bulk publishing", async () => {
    assert.equal((await admin.call("POST", "/api/admin/papers/status", { status: "published" })).status, 200);
    assert.equal((await PaperModel.countDocuments({ source: "pdf-upload", status: "published" })), 0);
    assert.equal((await admin.call("PATCH", `/api/admin/papers/${paperIds.math}/status`, { status: "published" })).status, 400);
    const papers = await admin.call("GET", "/api/admin/papers");
    assert.ok(papers.json.data.papers.every((paper: { source: string }) => paper.source !== "pdf-upload"));

    // Even once the test is active (its questions published), the bank queries leave them out.
    assert.equal((await admin.call("POST", `/api/admin/test-uploads/${id}/active`, { active: true })).status, 200);
    const catalog = await student.call("GET", "/api/practice/catalog");
    const examPaperIds = catalog.json.data.exams.flatMap((exam: { sections: Record<string, { paperId: string }> }) => Object.values(exam.sections).map((s) => s.paperId));
    assert.ok(!examPaperIds.includes(paperIds.math) && !examPaperIds.includes(paperIds.reading_writing));
    assert.equal((await student.call("POST", "/api/practice/attempts", { paperId: paperIds.math })).status, 404);
    const tagged = new Set((await QuestionModel.find({ tags: "full-test" }).select("_id").lean()).map((q) => String(q._id)));
    for (const section of ["math", "reading_writing"]) {
      const mock = await student.call("POST", "/api/practice/mocks", { section, paperIds: [] });
      assert.equal(mock.status, 201, JSON.stringify(mock.json.error));
      const attempt = await AttemptModel.findById(mock.json.data.attempt.id).lean();
      assert.ok(attempt!.items.every((item) => !tagged.has(String(item.questionId))));
      await student.call("DELETE", `/api/practice/attempts/${mock.json.data.attempt.id}`);
    }
    const mockFromTest = await student.call("POST", "/api/practice/mocks", { section: "math", paperIds: [paperIds.math] });
    assert.equal(mockFromTest.status, 400);
    assert.equal((await admin.call("POST", `/api/admin/test-uploads/${id}/active`, { active: false })).status, 200);
  });

  await check("a test can only be activated when all six modules have questions", async () => {
    assert.deepEqual((await student.call("GET", "/api/practice/tests")).json.data.tests, []);
    assert.equal((await student.call("POST", "/api/practice/full-tests", { testUploadId: id })).status, 404);
    await QuestionModel.updateMany({ paperId: paperIds.math, moduleType: "m2_hard" }, { $set: { moduleType: "unknown" } });
    const refused = await admin.call("POST", `/api/admin/test-uploads/${id}/active`, { active: true });
    assert.equal(refused.status, 400);
    assert.match(refused.json.error!.message, /Empty: Math Module 2 \(harder\)/);
    await QuestionModel.updateMany({ paperId: paperIds.math, moduleType: "unknown" }, { $set: { moduleType: "m2_hard" } });
    const activated = await admin.call("POST", `/api/admin/test-uploads/${id}/active`, { active: true });
    assert.equal(activated.status, 200);
    const listed = (await student.call("GET", "/api/practice/tests")).json.data.tests;
    assert.equal(listed.length, 1);
    assert.deepEqual(listed[0].moduleCounts.reading_writing, { m1: 27, m2_easy: 27, m2_hard: 27 });
  });

  // Answers the current module: `correct` of them right, the rest wrong.
  async function answerModule(attemptId: string, correct: number, gridInForm?: (values: string[]) => string) {
    const { json } = await student.call("GET", `/api/practice/attempts/${attemptId}`);
    const { moduleStart, moduleQuestionCount } = json.data.attempt.mock;
    const attempt = await AttemptModel.findById(attemptId).lean();
    for (let offset = 0; offset < moduleQuestionCount; offset += 1) {
      const position = moduleStart + offset;
      const question = await QuestionModel.findById(attempt!.items[position - 1]!.questionId).select("+correctAnswer").lean();
      const key = question!.correctAnswer!;
      const right = offset < correct;
      const answer = question!.questionType === "mcq" ? (right ? key.choiceKey! : "ABCD".replace(key.choiceKey!, "")[0]!) : right ? (gridInForm ?? ((v) => v[0]!))(key.acceptedValues) : "9999";
      const saved = await student.call("PATCH", `/api/practice/attempts/${attemptId}/questions/${position}`, { answer });
      assert.equal(saved.status, 200, JSON.stringify(saved.json.error));
    }
    return { moduleStart, moduleQuestionCount };
  }

  await check("a student sits the test: English routed hard (27/27), Math routed easy (11/22 < 15)", async () => {
    const started = await student.call("POST", "/api/practice/full-tests", { testUploadId: id, timed: true });
    assert.equal(started.status, 201, JSON.stringify(started.json.error));
    const fullTest = started.json.data.fullTest;
    assert.equal(fullTest.name, "E2E Practice Test 1");
    const rwId = fullTest.readingWriting.id;
    const rwModules = await QuestionModel.find({ paperId: paperIds.reading_writing }).sort({ questionNumber: 1 }).lean();
    let attempt = await AttemptModel.findById(rwId).lean();
    assert.deepEqual(attempt!.items.map((item) => String(item.questionId)), rwModules.filter((q) => q.moduleType === "m1").map((q) => String(q._id)));
    assert.equal(attempt!.timeLimitSeconds, 32 * 60);

    await answerModule(rwId, 27);
    const routed = await student.call("POST", `/api/practice/attempts/${rwId}/submit-module`);
    assert.equal(routed.json.data.attempt.mock.m2Type, "m2_hard");
    assert.equal(routed.json.data.attempt.mock.routingRequiredCorrect, 18);
    attempt = await AttemptModel.findById(rwId).lean();
    assert.deepEqual(attempt!.items.slice(27).map((item) => String(item.questionId)), rwModules.filter((q) => q.moduleType === "m2_hard").map((q) => String(q._id)));
    await answerModule(rwId, 10);
    assert.equal((await student.call("POST", `/api/practice/attempts/${rwId}/end`)).status, 200);

    const continued = await student.call("POST", `/api/practice/full-tests/${fullTest.id}/continue`);
    assert.equal(continued.status, 200, JSON.stringify(continued.json.error));
    const mathId = continued.json.data.fullTest.math.id;
    await answerModule(mathId, 11);
    const mathRouted = await student.call("POST", `/api/practice/attempts/${mathId}/submit-module`);
    assert.equal(mathRouted.json.data.attempt.mock.m1Correct, 11);
    assert.equal(mathRouted.json.data.attempt.mock.routingRequiredCorrect, 15);
    assert.equal(mathRouted.json.data.attempt.mock.m2Type, "m2_easy");
    // Grid-ins answered with the last accepted form (e.g. the fraction instead of the decimal).
    await answerModule(mathId, 22, (values) => values[values.length - 1]!);
    await student.call("POST", `/api/practice/attempts/${mathId}/end`);
    const result = await student.call("GET", `/api/practice/attempts/${mathId}/result`);
    const module2 = result.json.data.questions.filter((q: { module: string }) => q.module === "m2_easy");
    assert.equal(module2.length, 22);
    assert.ok(module2.filter((q: { questionType: string }) => q.questionType === "spr").length > 0);
    assert.ok(module2.every((q: { result: { correct: boolean } }) => q.result.correct === true));
    const done = await student.call("GET", `/api/practice/full-tests/${fullTest.id}`);
    assert.equal(done.json.data.fullTest.stage, "done");
  });

  await check("questions are edited in the bank afterwards: text, choices, type and an image", async () => {
    const question = await QuestionModel.findOne({ paperId: paperIds.math, moduleType: "m1", questionNumber: 1 }).lean();
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    const form = new FormData();
    form.append("image", new Blob([png], { type: "image/png" }), "graph.png");
    const image = await admin.call("POST", "/api/admin/assets", undefined, form);
    assert.equal(image.status, 201, JSON.stringify(image.json.error));
    const fake = new FormData();
    fake.append("image", new Blob(["<svg onload=alert(1)>"], { type: "image/png" }), "x.png");
    assert.equal((await admin.call("POST", "/api/admin/assets", undefined, fake)).status, 400);

    const patched = await admin.call("PATCH", `/api/admin/questions/${question!._id}`, {
      prompt: "If $3x = 12$, what is $x$? {viz}",
      choices: [{ key: "A", text: "$4$" }, { key: "B", text: "$5$" }, { key: "C", text: "$6$" }, { key: "D", text: "$\\frac{1}{2}$" }],
      correctAnswer: { choiceKey: "A", acceptedValues: [] },
      assets: [{ url: image.json.data.url, maxWidth: 300 }],
    });
    assert.equal(patched.status, 200, JSON.stringify(patched.json.error));
    assert.equal(patched.json.data.question.assets[0].url, image.json.data.url);
    assert.equal(patched.json.data.question.testUploadId, id);
    const stored = await QuestionModel.findById(question!._id).lean();
    assert.ok(stored!.tags.includes("full-test"));
    assert.equal(stored!.status, "published");

    const notOurs = await admin.call("PATCH", `/api/admin/questions/${question!._id}`, { assets: [{ url: "https://example.com/x.png", maxWidth: null }] });
    assert.equal(notOurs.status, 400);
    const toGridIn = await admin.call("PATCH", `/api/admin/questions/${question!._id}`, { questionType: "spr", correctAnswer: { choiceKey: null, acceptedValues: ["4"] } });
    assert.equal(toGridIn.status, 200);
    assert.deepEqual(toGridIn.json.data.question.choices, []);
    const noAnswer = await admin.call("PATCH", `/api/admin/questions/${question!._id}`, { questionType: "mcq" });
    assert.equal(noAnswer.status, 400);
  });

  // The other SAT Sharks site's own demo PDFs (its category names, plain-text Math with $ amounts and
  // x^2), copied into the folder as other-site-english.pdf / other-site-math.pdf when available.
  if (existsSync(join(folder!, "other-site-math.pdf"))) {
    await check("the other site's PDFs upload unchanged: categories mapped, plain-text Math converted", async () => {
      const created = await upload({ title: "Other site demo", year: "2026", testNumber: "50" }, { readingWriting: "other-site-english.pdf", math: "other-site-math.pdf" });
      const data = created.json.data.upload;
      assert.equal(data.readingWriting.status, "extracted", data.readingWriting.errorMessage);
      assert.equal(data.math.status, "extracted", data.math.errorMessage);
      assert.deepEqual(data.readingWriting.moduleCounts, { m1: 27, m2_easy: 27, m2_hard: 27 });
      assert.deepEqual(data.math.moduleCounts, { m1: 22, m2_easy: 22, m2_hard: 22 });
      assert.match(data.math.warnings[0], /plain text/);
      const { json } = await admin.call("GET", `/api/admin/test-uploads/${data.id}`);
      const rw = json.data.upload.readingWriting.questions;
      const math = json.data.upload.math.questions;
      const at = (number: number) => rw.find((q: { module: string; questionNumber: number }) => q.module === "m1" && q.questionNumber === number);
      assert.deepEqual([at(1).topic, at(1).skill], ["Craft and Structure", "Words in Context"]);
      assert.deepEqual([at(8).topic, at(8).skill], ["Information and Ideas", "Central Ideas and Details"]);
      assert.equal(at(14).topic, "Standard English Conventions");
      assert.equal(at(20).skill, "Transitions");
      assert.equal(at(25).skill, "Rhetorical Synthesis");
      assert.equal(math[0].topic, "Algebra");
      assert.equal(math[1].topic, "Problem-Solving and Data Analysis");
      assert.equal(math[2].topic, "Geometry and Trigonometry");
      assert.match(math[3].prompt, /one-time fee of \\\$90 plus \\\$24/);
      assert.match(math[4].prompt, /3x² - 3x \+ 6/);
      assert.match(math[9].choices[3].text, /25π/);
      // Every question passes the review rules as extracted, so it can be saved straight away.
      for (const [section, field] of [["reading_writing", "readingWriting"], ["math", "math"]] as const) {
        const questions = json.data.upload[field].questions.map(({ questionNumber: _n, ...rest }: Record<string, unknown>) => rest);
        const saved = await admin.call("PUT", `/api/admin/test-uploads/${data.id}/sections/${section}`, { questions });
        assert.equal(saved.status, 200, JSON.stringify(saved.json.error));
      }
      assert.equal((await admin.call("DELETE", `/api/admin/test-uploads/${data.id}`)).status, 200);
    });
  }

  await check("deactivating hides the test; a draft can be deleted, a published test cannot", async () => {
    await admin.call("POST", `/api/admin/test-uploads/${id}/active`, { active: false });
    assert.deepEqual((await student.call("GET", "/api/practice/tests")).json.data.tests, []);
    assert.equal((await admin.call("DELETE", `/api/admin/test-uploads/${id}`)).status, 409);
    const draft = await upload({ title: "Draft only", year: "2026", testNumber: "2" }, { math: "demo-math.pdf" });
    assert.equal((await admin.call("DELETE", `/api/admin/test-uploads/${draft.json.data.upload.id}`)).status, 200);
    assert.equal(await TestUploadModel.countDocuments(), 1);
    assert.equal(await PaperModel.countDocuments({ source: "pdf-upload" }), 2);
  });

  console.log(`\n${passed} end-to-end checks passed.`);
}
