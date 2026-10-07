/*
 * End-to-end API check for the full-test upload feature, as used on the primary SAT Sharks site.
 * Reference only: adapt routes, field names, model names and seed data to the target codebase.
 *
 * It starts an in-memory MongoDB (never the real database), seeds categories plus an admin and a
 * student, launches the backend with DATABASE_URL pointed at the memory server, then drives:
 * create -> duplicate/invalid rejections -> re-upload -> review -> publish -> practice exclusion
 * -> activation guard -> student adaptive routing (65% rule) -> grid-in grading -> delete.
 *
 * Setup (outside the repo):
 *   mkdir e2e-tools && cd e2e-tools && npm init -y && npm install mongodb-memory-server
 * Run:
 *   REPO=<path to repo> MMS_DIR=<path to e2e-tools> NODE_PATH=<repo>/node_modules node api-e2e.js
 * Expects the sample PDFs at <repo>/frontend/public/full-test-import-sample-{english,math}.pdf
 * (2 questions per module). On Windows, if mongod exits with code 3221225781 the Visual C++
 * runtime is missing: install it, or set MONGOMS_SYSTEM_BINARY to a mongod.exe that has
 * msvcp140.dll / vcruntime140.dll / vcruntime140_1.dll next to it.
 */
// End-to-end check of the full-test upload flow against an in-memory MongoDB.
// Never touches the production database: DATABASE_URL is forced to the memory server.
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const assert = require("assert/strict");
const { MongoMemoryServer } = require(path.join(process.env.MMS_DIR, "node_modules", "mongodb-memory-server"));
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const REPO = process.env.REPO;
const PORT = 5055;
const BASE = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = "e2e-secret-e2e-secret-e2e-secret-123456";
const step = (msg) => console.log(`\n✔ ${msg}`);

(async () => {
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri("sat-e2e");
  assert.ok(uri.includes("127.0.0.1"), "must be a local memory server");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // --- seed ---
  const cats = {};
  for (const [name, section] of [
    ["SAT Algebra", "MATH"], ["SAT Advanced Math", "MATH"], ["SAT Data & Statistics", "MATH"], ["SAT Geometry", "MATH"],
    ["SAT Reading Comprehension", "READING_WRITING"], ["SAT Grammar & Writing", "READING_WRITING"],
  ]) {
    const { insertedId } = await db.collection("questioncategories").insertOne({ name, section, description: "" });
    cats[name] = insertedId;
  }
  const mkUser = async (role) => {
    const { insertedId } = await db.collection("users").insertOne({
      name: role, email: `${role.toLowerCase()}@e2e.test`, password: "x", role, region: "LOCAL",
      subscription: "PAID", status: "ACTIVE", createdAt: new Date(),
    });
    return jwt.sign({ userId: String(insertedId), role, typ: "access" }, JWT_SECRET, { expiresIn: "1h" });
  };
  const adminToken = await mkUser("ADMIN");
  const studentToken = await mkUser("STUDENT");
  // An ordinary bank question that practice should still see.
  const { insertedId: bankQuestionId } = await db.collection("questions").insertOne({
    text: "Bank question", options: ["A", "B", "C", "D"].map((label) => ({ label, text: label })), correctAnswer: "A",
    explanation: "x", category: cats["SAT Algebra"], difficulty: "MEDIUM", section: "MATH", tags: [],
    source: "MANUAL", status: "PUBLISHED", createdAt: new Date(),
  });

  // --- backend ---
  const server = spawn(process.execPath, [path.join(REPO, "node_modules/tsx/dist/cli.mjs"), path.join(REPO, "backend/src/server.ts")], {
    env: { ...process.env, DATABASE_URL: uri, PORT: String(PORT), NODE_ENV: "development", JWT_SECRET, JWT_REFRESH_SECRET: JWT_SECRET + "r" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  server.stdout.on("data", (d) => (serverLog += d));
  server.stderr.on("data", (d) => (serverLog += d));
  try {
    for (let i = 0; i < 120; i++) {
      try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }

    const call = async (method, url, { token = adminToken, body, form } = {}) => {
      const headers = { Authorization: `Bearer ${token}` };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      const res = await fetch(`${BASE}${url}`, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
      return { status: res.status, ...(await res.json()) };
    };
    const pdf = (name) => new Blob([fs.readFileSync(path.join(REPO, `frontend/public/full-test-import-sample-${name}.pdf`))], { type: "application/pdf" });
    const createForm = (fields, files) => {
      const form = new FormData();
      Object.entries(fields).forEach(([k, v]) => form.append(k, v));
      Object.entries(files).forEach(([k, v]) => form.append(k, v, `${k}.pdf`));
      return form;
    };

    // 1. create with both PDFs
    let r = await call("POST", "/api/uploads/full-tests", {
      form: createForm({ title: "E2E Test 15", year: "2026", testNumber: "15" }, { readingWriting: pdf("english"), math: pdf("math") }),
    });
    assert.equal(r.status, 201, JSON.stringify(r));
    const id = r.upload._id;
    assert.equal(r.upload.readingWriting.status, "EXTRACTED", r.upload.readingWriting.errorMessage);
    assert.equal(r.upload.math.status, "EXTRACTED", r.upload.math.errorMessage);
    assert.deepEqual(r.upload.math.moduleCounts, { MODULE_1: 2, MODULE_2_EASY: 2, MODULE_2_HARD: 2 });
    assert.equal(r.upload.math.questions, undefined, "list/create responses omit question bodies");
    assert.equal(r.upload.math.warnings.length, 3);
    step("create: both sections extracted, counts + warnings, no bodies in summary");

    // 2. duplicate year/number blocked
    r = await call("POST", "/api/uploads/full-tests", { form: createForm({ title: "dup", year: "2026", testNumber: "15" }, { math: pdf("math") }) });
    assert.equal(r.status, 409);
    step("duplicate year/test number rejected (409)");

    // 3. bad inputs
    r = await call("POST", "/api/uploads/full-tests", { form: createForm({ title: "x", year: "9999", testNumber: "1" }, { math: pdf("math") }) });
    assert.equal(r.status, 400);
    r = await call("POST", "/api/uploads/full-tests", { form: createForm({ title: "x", year: "2026", testNumber: "2" }, {}) });
    assert.equal(r.status, 400);
    r = await call("POST", "/api/uploads/full-tests", { token: studentToken, form: createForm({ title: "x", year: "2026", testNumber: "3" }, { math: pdf("math") }) });
    assert.equal(r.status, 403);
    step("year 9999 / no files / student caller rejected");

    // 4. publish before review
    r = await call("POST", `/api/uploads/full-tests/${id}/publish`, { body: {} });
    assert.equal(r.status, 400);
    assert.match(r.error, /Review and save/);
    step("publish blocked until both sections reviewed");

    // 5. wrong file in the Math slot -> FAILED; then correct file -> EXTRACTED
    let form = new FormData(); form.append("file", pdf("english"), "english.pdf");
    r = await call("POST", `/api/uploads/full-tests/${id}/sections/MATH/file`, { form });
    assert.equal(r.status, 200);
    assert.equal(r.upload.math.status, "FAILED");
    assert.match(r.upload.math.errorMessage, /SECTION: READING_WRITING, but it was uploaded as the Math file/);
    form = new FormData(); form.append("file", pdf("math"), "math.pdf");
    r = await call("POST", `/api/uploads/full-tests/${id}/sections/MATH/file`, { form });
    assert.equal(r.upload.math.status, "EXTRACTED");
    step("re-upload: section mismatch reported, correct re-upload recovers");

    // 6. unknown category is reported at upload time
    // (simulate by renaming a category, uploading, then restoring)
    await db.collection("questioncategories").updateOne({ name: "SAT Advanced Math" }, { $set: { name: "Renamed" } });
    form = new FormData(); form.append("file", pdf("math"), "math.pdf");
    r = await call("POST", `/api/uploads/full-tests/${id}/sections/MATH/file`, { form });
    assert.equal(r.upload.math.status, "FAILED");
    assert.match(r.upload.math.errorMessage, /CATEGORY "SAT Advanced Math" does not exist/);
    await db.collection("questioncategories").updateOne({ name: "Renamed" }, { $set: { name: "SAT Advanced Math" } });
    form = new FormData(); form.append("file", pdf("math"), "math.pdf");
    r = await call("POST", `/api/uploads/full-tests/${id}/sections/MATH/file`, { form });
    assert.equal(r.upload.math.status, "EXTRACTED");
    step("unknown category rejected at upload");

    // 7. review: invalid save rejected, valid save marks REVIEWED
    r = await call("GET", `/api/uploads/full-tests/${id}`);
    const rwQuestions = r.upload.readingWriting.questions;
    const mathQuestions = r.upload.math.questions;
    assert.equal(mathQuestions.find((q) => q.questionType === "GRID_IN").options.length, 0);
    const broken = structuredClone(mathQuestions); broken[0].explanation = ""; broken[1].correctAnswer = "";
    r = await call("PUT", `/api/uploads/full-tests/${id}/sections/MATH`, { body: { questions: broken } });
    assert.equal(r.status, 400);
    assert.match(r.error, /EXPLANATION is required/); assert.match(r.error, /ANSWER is required/);
    const rwGrid = structuredClone(rwQuestions); rwGrid[0].questionType = "GRID_IN";
    r = await call("PUT", `/api/uploads/full-tests/${id}/sections/READING_WRITING`, { body: { questions: rwGrid } });
    assert.equal(r.status, 400); assert.match(r.error, /only allowed in the Math section/);
    // admin edits a value, then saves
    const edited = structuredClone(mathQuestions); edited[0].text = "Edited: If 3x + 7 = 22, what is x?";
    r = await call("PUT", `/api/uploads/full-tests/${id}/sections/MATH`, { body: { questions: edited } });
    assert.equal(r.status, 200, r.error); assert.equal(r.upload.math.status, "REVIEWED");
    r = await call("PUT", `/api/uploads/full-tests/${id}/sections/READING_WRITING`, { body: { questions: rwQuestions } });
    assert.equal(r.status, 200, r.error); assert.equal(r.upload.readingWriting.status, "REVIEWED");
    step("review: invalid edits rejected with reasons, valid saves mark REVIEWED");

    // 8. publish
    r = await call("POST", `/api/uploads/full-tests/${id}/publish`, { body: {} });
    assert.equal(r.status, 200, r.error);
    assert.equal(r.questionCount, 12);
    const testId = r.testId;
    const test = await db.collection("sattests").findOne({ _id: new mongoose.Types.ObjectId(testId) });
    assert.equal(test.isAdaptive, true); assert.equal(test.isActive, false);
    assert.deepEqual(test.modules.map((m) => m.name), [
      "Reading & Writing Module 1", "Reading & Writing Module 2 - Easier", "Reading & Writing Module 2 - Harder",
      "Math Module 1", "Math Module 2 - Easier", "Math Module 2 - Harder",
    ]);
    assert.deepEqual(test.modules.map((m) => m.section), ["READING_WRITING", "READING_WRITING", "READING_WRITING", "MATH", "MATH", "MATH"]);
    assert.deepEqual(test.modules.map((m) => m.timeLimitMinutes), [32, 32, 32, 35, 35, 35]);
    assert.deepEqual(test.modules.map((m) => m.questions.length), [2, 2, 2, 2, 2, 2]);
    const published = await db.collection("questions").find({ tags: `full-test:${testId}` }).toArray();
    assert.equal(published.length, 12);
    assert.ok(published.every((q) => q.tags.includes("full-test") && q.status === "PUBLISHED"));
    const grid = published.find((q) => q.options.length === 0);
    assert.equal(grid.correctAnswer, "0.75 or 3/4");
    assert.ok(published.some((q) => q.text === "Edited: If 3x + 7 = 22, what is x?"), "review edit was published");
    r = await call("POST", `/api/uploads/full-tests/${id}/publish`, { body: {} });
    assert.equal(r.status, 409);
    form = new FormData(); form.append("file", pdf("math"), "math.pdf");
    r = await call("POST", `/api/uploads/full-tests/${id}/sections/MATH/file`, { form });
    assert.equal(r.status, 409);
    step("publish: hidden adaptive test, 6 modules in routing order, tagged questions; re-publish/re-upload blocked");

    // 9. practice exclusion
    r = await call("GET", "/api/questions?section=MATH&limit=500", { token: studentToken });
    const ids = r.questions.map((q) => q._id);
    assert.ok(ids.includes(String(bankQuestionId)), "bank question still visible");
    assert.ok(!published.some((q) => ids.includes(String(q._id))), "full-test questions hidden from practice");
    r = await call("POST", "/api/practice/custom-test", { token: studentToken, body: { subject: "MATH" } });
    assert.equal(r.success, true, r.error);
    const attempt = await db.collection("sattestattempts").findOne({ _id: new mongoose.Types.ObjectId(r.attemptId) });
    const custom = await db.collection("sattests").findOne({ _id: attempt.test });
    const customIds = custom.modules.flatMap((m) => m.questions.map(String));
    assert.ok(!published.some((q) => customIds.includes(String(q._id))), "custom test excludes full-test questions");
    step("practice list and generated custom tests exclude full-test questions");

    // 10. activation guard + student adaptive routing
    const { insertedId: emptyTestId } = await db.collection("sattests").insertOne({
      title: "Empty", year: 2026, testNumber: 99, isAdaptive: true, isActive: false, breakDurationMinutes: 10,
      modules: test.modules.map((m, i) => ({ ...m, questions: i === 4 ? [] : m.questions })),
    });
    r = await call("PUT", `/api/sat/admin/${emptyTestId}`, { body: { isActive: true } });
    assert.equal(r.status, 400); assert.match(r.error, /Math Module 2 - Easier/);
    r = await call("PUT", `/api/sat/admin/${testId}`, { body: { isActive: true } });
    assert.equal(r.status, 200, r.error);
    r = await call("POST", `/api/sat/${testId}/start`, { token: studentToken, body: {} });
    assert.equal(r.status, 201, r.error);
    const attemptId = r.attempt._id;
    const answersFor = (moduleIndex, correct) =>
      test.modules[moduleIndex].questions.map((qid) => {
        const q = published.find((p) => String(p._id) === String(qid));
        return { question: String(qid), selectedAnswer: correct ? q.correctAnswer.split(" or ")[0] : "Z" };
      });
    r = await call("POST", `/api/sat/attempt/${attemptId}/complete-module`, { token: studentToken, body: { moduleIndex: 0, answers: answersFor(0, true) } });
    assert.equal(r.attempt.currentModuleIndex, 2, "100% on English M1 -> harder English M2");
    r = await call("POST", `/api/sat/attempt/${attemptId}/complete-module`, { token: studentToken, body: { moduleIndex: 2, answers: answersFor(2, true) } });
    assert.equal(r.attempt.status, "ON_BREAK");
    r = await call("POST", `/api/sat/attempt/${attemptId}/end-break`, { token: studentToken, body: {} });
    r = await call("POST", `/api/sat/attempt/${attemptId}/complete-module`, { token: studentToken, body: { moduleIndex: 3, answers: answersFor(3, false) } });
    assert.equal(r.attempt.currentModuleIndex, 4, "0% on Math M1 -> easier Math M2");
    // grid-in graded via the typed answer
    r = await call("POST", `/api/sat/attempt/${attemptId}/complete-module`, { token: studentToken, body: { moduleIndex: 4, answers: answersFor(4, true) } });
    assert.equal(r.attempt.status, "COMPLETED");
    const done = await db.collection("sattestattempts").findOne({ _id: new mongoose.Types.ObjectId(attemptId) });
    assert.equal(done.moduleAttempts[4].correctCount, 2, "both Math M2 easy answers (incl. grid-in) graded correct");
    step("activation guard works; student routing: English hard path, Math easy path; grid-in graded");

    // 11. admin adds a question to the uploaded test -> inherits tags
    r = await call("POST", `/api/sat/admin/${testId}/modules/3/questions`, {
      body: { text: "Added", options: ["A", "B", "C", "D"].map((label) => ({ label, text: label })), correctAnswer: "A", explanation: "e",
        category: String(cats["SAT Algebra"]), difficulty: "EASY", section: "MATH" },
    });
    assert.equal(r.status, 201, r.error);
    assert.ok(r.question.tags.includes("full-test") && r.question.tags.includes(`full-test:${testId}`));
    step("question added to the uploaded test inherits the full-test tags");

    // 12. list + delete
    r = await call("GET", "/api/uploads/full-tests");
    assert.equal(r.uploads.length, 1); assert.equal(r.uploads[0].status, "PUBLISHED"); assert.equal(r.uploads[0].math.questions, undefined);
    r = await call("DELETE", `/api/uploads/full-tests/${id}`);
    assert.equal(r.status, 200);
    assert.ok(await db.collection("sattests").findOne({ _id: new mongoose.Types.ObjectId(testId) }), "published test kept");
    // old practice-question uploads route still answers
    r = await call("GET", "/api/uploads");
    assert.equal(r.status, 200);
    step("list omits bodies; deleting the upload keeps the published test; /api/uploads unaffected");

    console.log("\nALL E2E CHECKS PASSED");
  } catch (error) {
    console.error("\nE2E FAILURE:", error);
    console.error("--- server log tail ---\n" + serverLog.split("\n").slice(-40).join("\n"));
    process.exitCode = 1;
  } finally {
    server.kill();
    await mongoose.disconnect();
    await mongo.stop();
  }
})();
