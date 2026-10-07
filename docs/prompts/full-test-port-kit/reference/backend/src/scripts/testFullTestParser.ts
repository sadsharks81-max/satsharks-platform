import assert from "node:assert/strict";
import { parseFullTestSectionDocument } from "../utils/full-test-parser";

const mcq = (n: number, category: string) => `QUESTION ${n}
CATEGORY: ${category}
DIFFICULTY: MEDIUM
PROMPT: If 3x + 7 = 22,
what is the value of x?
A: 3
B: 5
C: 7
D: 15
ANSWER: B
EXPLANATION: Subtract 7 from both sides,
then divide by 3.
END QUESTION`;

const gridIn = (n: number) => `QUESTION ${n}
CATEGORY: SAT Algebra
DIFFICULTY: HARD
TYPE: GRID_IN
PROMPT: What is the value of 1/2?
ANSWER: 0.5 or 1/2
EXPLANATION: One half equals 0.5.
END QUESTION`;

const mathModule = (header: string, count: number) =>
  [header, ...Array.from({ length: count }, (_, i) => (i === 1 ? gridIn(i + 1) : mcq(i + 1, "SAT Algebra"))), "END MODULE"].join("\n\n");

const mathDocument = [
  "SAT Sharks Full Test - Math",
  "SECTION: MATH",
  mathModule("MODULE 1", 22),
  "-- 1 of 9 --",
  mathModule("MODULE 2 EASY", 22),
  mathModule("MODULE 2 HARD", 22),
].join("\n\n");

const math = parseFullTestSectionDocument(mathDocument);
assert.deepEqual(math.errors, []);
assert.deepEqual(math.warnings, []);
assert.equal(math.section, "MATH");
assert.equal(math.questions.length, 66);
assert.deepEqual(
  ["MODULE_1", "MODULE_2_EASY", "MODULE_2_HARD"].map((slot) => math.questions.filter((q) => q.moduleSlot === slot).length),
  [22, 22, 22],
);
// Math keeps the author's line breaks (equations, tables).
assert.equal(math.questions[0].text, "If 3x + 7 = 22,\nwhat is the value of x?");
assert.equal(math.questions[0].correctAnswer, "B");
const grid = math.questions[1];
assert.equal(grid.questionType, "GRID_IN");
assert.deepEqual(grid.options, []);
assert.equal(grid.correctAnswer, "0.5 or 1/2");

const rwQuestion = (n: number) => `QUESTION ${n}
CATEGORY: SAT Reading Comprehension
DIFFICULTY: EASY
PASSAGE: The following text is adapted from a
novel. The narrator walks
through the old town.

Text 2
A second short passage.
• first note
• second note
PROMPT: Which choice best states the main
idea of the text?
A: Choice one
B: Choice two
that wraps
C: Choice three
D: Choice four
ANSWER: a
EXPLANATION: Choice A states
the central claim.
END QUESTION`;

const rwModule = (header: string, count: number) =>
  [header, ...Array.from({ length: count }, (_, i) => rwQuestion(i + 1)), "END MODULE"].join("\n");

const rw = parseFullTestSectionDocument(
  ["SECTION: READING_WRITING", rwModule("MODULE 1", 27), rwModule("MODULE 2 EASIER", 27), rwModule("MODULE 2 HARD", 26)].join("\n"),
);
assert.deepEqual(rw.errors, []);
assert.equal(rw.section, "READING_WRITING");
assert.equal(rw.questions.length, 80);
// Wrapped prose is re-joined; paragraphs and bullets stay; prompt is the final line.
assert.equal(
  rw.questions[0].text,
  "The following text is adapted from a novel. The narrator walks through the old town.\nText 2 A second short passage.\n• first note\n• second note\nWhich choice best states the main idea of the text?",
);
assert.equal(rw.questions[0].options[1].text, "Choice two that wraps");
assert.equal(rw.questions[0].correctAnswer, "A");
assert.equal(rw.questions[0].explanation, "Choice A states the central claim.");
assert.deepEqual(rw.warnings, ["Module 2 Hard has 26 questions; an official module has 27."]);

// --- Rejections ---
const errorsFor = (doc: string) => parseFullTestSectionDocument(doc).errors.join("\n");

assert.match(errorsFor(mathModule("MODULE 1", 2)), /Missing `SECTION/);
assert.match(errorsFor(["SECTION: MATH", mathModule("MODULE 1", 2)].join("\n")), /Module 2 Easy is missing/);
assert.match(
  errorsFor(["SECTION: MATH", mathModule("MODULE 1", 2), mathModule("MODULE 1", 2)].join("\n")),
  /Module 1 appears more than once/,
);
assert.match(
  errorsFor(["SECTION: READING_WRITING", "MODULE 1", gridIn(1), "END MODULE"].join("\n")),
  /GRID_IN is only allowed in the Math section/,
);
assert.match(
  errorsFor(["SECTION: MATH", "MODULE 1", mcq(1, "X").replace("ANSWER: B", "ANSWER: E"), "END MODULE"].join("\n")),
  /ANSWER must be exactly A, B, C, or D/,
);
assert.match(
  errorsFor(["SECTION: MATH", "MODULE 1", mcq(1, "X").replace("D: 15\n", ""), "END MODULE"].join("\n")),
  /choices A, B, C, and D are all required/,
);
assert.match(
  errorsFor(["SECTION: MATH", "MODULE 1", mcq(1, "X"), mcq(3, "X"), "END MODULE"].join("\n")),
  /must be consecutive/,
);
assert.match(
  errorsFor(["SECTION: MATH", "MODULE 1", mcq(1, "X").replace("END QUESTION", ""), mcq(2, "X"), "END MODULE"].join("\n")),
  /question 1: missing END QUESTION/,
);
assert.match(errorsFor(["SECTION: MATH", mcq(1, "X")].join("\n")), /is outside a module/);
assert.match(
  errorsFor(["SECTION: MATH", "MODULE 1", mcq(1, "X").replace("DIFFICULTY: MEDIUM\n", "DIFFICULTY: MEDIUM\nSECTION: MATH\n"), "END MODULE"].join("\n")),
  /SECTION goes once at the top/,
);
assert.match(
  errorsFor(["SECTION: MATH", "MODULE 1", mcq(1, "X").replace("CATEGORY: X\nDIFFICULTY: MEDIUM", "DIFFICULTY: MEDIUM\nCATEGORY: X"), "END MODULE"].join("\n")),
  /out of order/,
);
assert.match(
  errorsFor(["SECTION: MATH", "MODULE 1", gridIn(1).replace("TYPE: GRID_IN", "TYPE: ESSAY"), "END MODULE"].join("\n")),
  /TYPE must be MULTIPLE_CHOICE or GRID_IN/,
);
// Any error rejects the whole file.
assert.equal(
  parseFullTestSectionDocument(mathDocument.replace("ANSWER: B", "ANSWER: Z")).questions.length,
  0,
);

console.log("full-test parser: all assertions passed");
