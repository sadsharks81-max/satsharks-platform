import { stripEmojis } from "./text";

export const FULL_TEST_SECTIONS = ["READING_WRITING", "MATH"] as const;
export const FULL_TEST_MODULE_SLOTS = ["MODULE_1", "MODULE_2_EASY", "MODULE_2_HARD"] as const;
export const FULL_TEST_QUESTION_TYPES = ["MULTIPLE_CHOICE", "GRID_IN"] as const;
export const FULL_TEST_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export type FullTestSection = (typeof FULL_TEST_SECTIONS)[number];
export type FullTestModuleSlot = (typeof FULL_TEST_MODULE_SLOTS)[number];
export type FullTestQuestionType = (typeof FULL_TEST_QUESTION_TYPES)[number];
type FullTestDifficulty = (typeof FULL_TEST_DIFFICULTIES)[number];

/** Question counts of an official Digital SAT module. Other counts only warn. */
export const STANDARD_MODULE_QUESTION_COUNT: Record<FullTestSection, number> = {
  READING_WRITING: 27,
  MATH: 22,
};

export const MODULE_SLOT_LABELS: Record<FullTestModuleSlot, string> = {
  MODULE_1: "Module 1",
  MODULE_2_EASY: "Module 2 Easy",
  MODULE_2_HARD: "Module 2 Hard",
};

const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const MAX_GRID_IN_ANSWER_LENGTH = 60;

export interface FullTestQuestion {
  moduleSlot: FullTestModuleSlot;
  questionNumber: number;
  questionType: FullTestQuestionType;
  text: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  category: string;
  difficulty: FullTestDifficulty;
}

export interface FullTestParseResult {
  section: FullTestSection | null;
  questions: FullTestQuestion[];
  errors: string[];
  warnings: string[];
}

const FIELD_ORDER = [
  "SECTION",
  "CATEGORY",
  "DIFFICULTY",
  "TYPE",
  "PASSAGE",
  "PROMPT",
  "A",
  "B",
  "C",
  "D",
  "ANSWER",
  "EXPLANATION",
] as const;
type FieldName = (typeof FIELD_ORDER)[number];

const FIELD_PATTERN =
  /^(SECTION|CATEGORY|DIFFICULTY|TYPE|PASSAGE|PROMPT|A|B|C|D|ANSWER|EXPLANATION)\s*:\s*(.*)$/i;
const SECTION_HEADER_PATTERN = /^SECTION\s*:\s*(.*)$/i;
const MODULE_START_PATTERN = /^MODULE\s+(1|2\s+EASY|2\s+EASIER|2\s+HARD|2\s+HARDER)\s*$/i;
const MODULE_END_PATTERN = /^END\s+MODULE\s*$/i;
const QUESTION_START_PATTERN = /^QUESTION\s+(\d{1,4})\s*$/i;
const QUESTION_END_PATTERN = /^END\s+QUESTION\s*$/i;
// pdf-parse joins pages with "-- 1 of 3 --"; that marker is never question content.
const PAGE_MARKER_PATTERN = /^--\s*\d+\s+of\s+\d+\s*--$/i;
const LIST_ITEM_PATTERN = /^([•◦▪●\-*]|\d+[.)])\s+/;

const moduleSlotFromHeader = (value: string): FullTestModuleSlot => {
  const normalized = value.toUpperCase().replace(/\s+/g, " ");
  if (normalized === "1") return "MODULE_1";
  return normalized.startsWith("2 EAS") ? "MODULE_2_EASY" : "MODULE_2_HARD";
};

const normalizeQuestionType = (value: string): FullTestQuestionType | null => {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!normalized || normalized === "MULTIPLE_CHOICE" || normalized === "MCQ") return "MULTIPLE_CHOICE";
  if (normalized === "GRID_IN" || normalized === "SPR") return "GRID_IN";
  return null;
};

/** Keeps the author's line breaks, which matter for equations and tables. */
const keepLines = (lines: string[]) =>
  lines.join("\n").trim().replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");

/**
 * Re-joins prose that the PDF wrapped at the page edge. A new paragraph starts
 * only at a blank line or a list item, so "Text 1"/"Text 2" and bullet notes
 * survive while every visual line break inside a sentence disappears.
 */
const reflow = (lines: string[]) => {
  const paragraphs: string[] = [];
  let current = "";
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (current) paragraphs.push(current);
      current = "";
      continue;
    }
    if (current && LIST_ITEM_PATTERN.test(line)) {
      paragraphs.push(current);
      current = line;
      continue;
    }
    current = current ? `${current} ${line}` : line;
  }
  if (current) paragraphs.push(current);
  return paragraphs.join("\n");
};

const singleLine = (lines: string[]) => lines.map((line) => line.trim()).filter(Boolean).join(" ");

/**
 * Builds the stored question text. The test runner shows the last line of a
 * Reading & Writing question as the question and everything above it as the
 * passage, so the prompt is always kept to one final line there.
 */
export const composeQuestionText = (passage: string, prompt: string) =>
  [passage.trim(), prompt.trim()].filter(Boolean).join("\n");

interface QuestionBlock {
  moduleSlot: FullTestModuleSlot;
  questionNumber: number;
  startLine: number;
  lines: string[];
  ended: boolean;
}

/**
 * Validates one question against the full-test rules. Shared by the PDF parser
 * and by the admin review save, so an edit in the review screen cannot produce a
 * question the PDF import would have rejected.
 */
export const validateFullTestQuestion = (
  question: Pick<
    FullTestQuestion,
    "questionType" | "text" | "options" | "correctAnswer" | "explanation" | "category"
  > & { difficulty: string },
  section: FullTestSection,
  prefix: string,
): string[] => {
  const errors: string[] = [];
  if (!question.text.trim()) errors.push(`${prefix}: PROMPT is required.`);
  if (!question.explanation.trim()) errors.push(`${prefix}: EXPLANATION is required.`);
  if (!question.category.trim()) errors.push(`${prefix}: CATEGORY is required.`);
  if (!FULL_TEST_DIFFICULTIES.includes(question.difficulty as FullTestDifficulty)) {
    errors.push(`${prefix}: DIFFICULTY must be EASY, MEDIUM, or HARD.`);
  }

  if (question.questionType === "GRID_IN") {
    if (section !== "MATH") {
      errors.push(`${prefix}: TYPE: GRID_IN is only allowed in the Math section.`);
    }
    if (question.options.some((option) => option.text.trim())) {
      errors.push(`${prefix}: GRID_IN questions must not have A-D choices.`);
    }
    const answer = question.correctAnswer.trim();
    if (!answer) {
      errors.push(`${prefix}: ANSWER is required.`);
    } else if (answer.length > MAX_GRID_IN_ANSWER_LENGTH || answer.includes("\n")) {
      errors.push(`${prefix}: a GRID_IN ANSWER must be one short line, e.g. "0.5 or 1/2".`);
    }
  } else {
    const complete =
      question.options.length === OPTION_LABELS.length &&
      question.options.every(
        (option, index) => option.label === OPTION_LABELS[index] && option.text.trim(),
      );
    if (!complete) {
      errors.push(
        `${prefix}: choices A, B, C, and D are all required (use TYPE: GRID_IN for a fill-in question).`,
      );
    }
    if (!OPTION_LABELS.includes(question.correctAnswer as (typeof OPTION_LABELS)[number])) {
      errors.push(`${prefix}: ANSWER must be exactly A, B, C, or D.`);
    }
  }
  return errors;
};

export const moduleCountWarnings = (section: FullTestSection, questions: Pick<FullTestQuestion, "moduleSlot">[]) => {
  const expected = STANDARD_MODULE_QUESTION_COUNT[section];
  return FULL_TEST_MODULE_SLOTS.flatMap((slot) => {
    const count = questions.filter((question) => question.moduleSlot === slot).length;
    return count > 0 && count !== expected
      ? [`${MODULE_SLOT_LABELS[slot]} has ${count} questions; an official module has ${expected}.`]
      : [];
  });
};

/**
 * Parses one section (Reading & Writing or Math) of a full adaptive test.
 *
 * Like the practice-question parser this is intentionally strict: a full test is
 * published as a unit, so one misread answer key or a missing module would ship
 * a broken exam. The whole file is rejected with line-level messages instead.
 */
export const parseFullTestSectionDocument = (text: string): FullTestParseResult => {
  const lines = text
    .replace(/\r/g, "")
    .replace(/\xa0/g, " ")
    // Invisible format characters (zero-width spaces, BOM, soft hyphens) that
    // PDF text extraction leaves behind would otherwise break label matching.
    .replace(/\p{Cf}/gu, "")
    .split("\n");

  const errors: string[] = [];
  let section: FullTestSection | null = null;
  let sectionDeclared = false;
  const seenModules = new Set<FullTestModuleSlot>();
  let currentModule: FullTestModuleSlot | null = null;
  let currentBlock: QuestionBlock | null = null;
  const blocks: QuestionBlock[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();
    if (PAGE_MARKER_PATTERN.test(trimmed)) continue;

    const moduleStart = trimmed.match(MODULE_START_PATTERN);
    const isModuleEnd = MODULE_END_PATTERN.test(trimmed);
    const questionStart = trimmed.match(QUESTION_START_PATTERN);

    // A new block or module boundary while a question is still open means its
    // END QUESTION line is missing; keep the block so the rest is still checked.
    if (currentBlock && (moduleStart || isModuleEnd || questionStart)) {
      errors.push(
        `${MODULE_SLOT_LABELS[currentBlock.moduleSlot]} question ${currentBlock.questionNumber}: missing END QUESTION.`,
      );
      blocks.push(currentBlock);
      currentBlock = null;
    }

    if (moduleStart) {
      if (currentModule) {
        errors.push(`${MODULE_SLOT_LABELS[currentModule]}: missing END MODULE before line ${lineNumber}.`);
      }
      const slot = moduleSlotFromHeader(moduleStart[1]);
      if (seenModules.has(slot)) {
        errors.push(`${MODULE_SLOT_LABELS[slot]} appears more than once (line ${lineNumber}).`);
      }
      seenModules.add(slot);
      currentModule = slot;
      continue;
    }

    if (isModuleEnd) {
      if (!currentModule) errors.push(`Line ${lineNumber}: END MODULE without a matching MODULE line.`);
      currentModule = null;
      continue;
    }

    if (questionStart) {
      if (!currentModule) {
        errors.push(
          `Line ${lineNumber}: QUESTION ${questionStart[1]} is outside a module. Put it between a MODULE line and END MODULE.`,
        );
        continue;
      }
      currentBlock = {
        moduleSlot: currentModule,
        questionNumber: Number(questionStart[1]),
        startLine: lineNumber,
        lines: [],
        ended: false,
      };
      continue;
    }

    if (QUESTION_END_PATTERN.test(trimmed)) {
      if (currentBlock) {
        currentBlock.ended = true;
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    if (currentBlock) {
      currentBlock.lines.push(rawLine);
      continue;
    }

    // The section header is the only field allowed outside a question block.
    const sectionHeader = trimmed.match(SECTION_HEADER_PATTERN);
    if (!sectionHeader) continue;
    if (sectionDeclared) {
      errors.push(`Line ${lineNumber}: SECTION appears more than once. Declare it once at the top.`);
      continue;
    }
    if (seenModules.size > 0) errors.push(`Line ${lineNumber}: SECTION must come before MODULE 1.`);
    sectionDeclared = true;
    const value = sectionHeader[1].trim().toUpperCase();
    if (FULL_TEST_SECTIONS.includes(value as FullTestSection)) {
      section = value as FullTestSection;
    } else {
      errors.push(`Line ${lineNumber}: SECTION must be READING_WRITING or MATH.`);
    }
  }

  if (currentBlock) {
    errors.push(
      `${MODULE_SLOT_LABELS[currentBlock.moduleSlot]} question ${currentBlock.questionNumber}: missing END QUESTION.`,
    );
    blocks.push(currentBlock);
  }
  if (currentModule) errors.push(`${MODULE_SLOT_LABELS[currentModule]}: missing END MODULE.`);

  if (!sectionDeclared) {
    errors.push("Missing `SECTION: READING_WRITING` or `SECTION: MATH` at the top of the file.");
  }
  for (const slot of FULL_TEST_MODULE_SLOTS) {
    if (!seenModules.has(slot)) {
      errors.push(
        `${MODULE_SLOT_LABELS[slot]} is missing. Every section needs MODULE 1, MODULE 2 EASY, and MODULE 2 HARD.`,
      );
    }
  }

  const questions: FullTestQuestion[] = [];
  const effectiveSection: FullTestSection = section ?? "MATH";
  const isRW = effectiveSection === "READING_WRITING";

  for (const slot of FULL_TEST_MODULE_SLOTS) {
    const moduleBlocks = blocks.filter((block) => block.moduleSlot === slot);
    if (seenModules.has(slot) && moduleBlocks.length === 0) {
      errors.push(`${MODULE_SLOT_LABELS[slot]} has no questions.`);
    }

    moduleBlocks.forEach((block, blockIndex) => {
      const prefix = `${MODULE_SLOT_LABELS[slot]} question ${block.questionNumber} (near PDF text line ${block.startLine})`;
      const blockErrors: string[] = [];

      if (blockIndex === 0 && block.questionNumber !== 1) {
        blockErrors.push(`${prefix}: numbering must start at 1 in every module.`);
      } else if (blockIndex > 0 && block.questionNumber !== moduleBlocks[blockIndex - 1].questionNumber + 1) {
        blockErrors.push(`${prefix}: question numbers must be consecutive.`);
      }

      const values = new Map<FieldName, string[]>();
      const fieldOrder: FieldName[] = [];
      let activeField: FieldName | null = null;
      for (const rawLine of block.lines) {
        const fieldMatch = rawLine.trim().match(FIELD_PATTERN);
        if (!fieldMatch) {
          if (activeField) values.get(activeField)?.push(rawLine);
          continue;
        }
        const field = fieldMatch[1].toUpperCase() as FieldName;
        activeField = field;
        if (field === "SECTION") {
          blockErrors.push(`${prefix}: SECTION goes once at the top of the file, not inside a question.`);
          activeField = null;
        } else if (values.has(field)) {
          blockErrors.push(`${prefix}: ${field} appears more than once.`);
        } else {
          values.set(field, [fieldMatch[2]]);
          fieldOrder.push(field);
        }
      }

      const expectedOrder = FIELD_ORDER.filter((field) => fieldOrder.includes(field));
      if (fieldOrder.some((field, index) => field !== expectedOrder[index])) {
        blockErrors.push(`${prefix}: fields are out of order. Follow the template order exactly.`);
      }

      const raw = (field: FieldName) => values.get(field) ?? [];
      const proseText = (field: FieldName) => (isRW ? reflow(raw(field)) : keepLines(raw(field)));

      const questionType = normalizeQuestionType(singleLine(raw("TYPE")));
      if (!questionType) blockErrors.push(`${prefix}: TYPE must be MULTIPLE_CHOICE or GRID_IN.`);
      const resolvedType: FullTestQuestionType = questionType ?? "MULTIPLE_CHOICE";

      const prompt = isRW ? singleLine(raw("PROMPT")) : keepLines(raw("PROMPT"));
      if (!prompt) blockErrors.push(`${prefix}: PROMPT is required.`);

      const hasAnyOption = OPTION_LABELS.some((label) => values.has(label));
      const answer = singleLine(raw("ANSWER"));
      const question: FullTestQuestion = {
        moduleSlot: slot,
        questionNumber: block.questionNumber,
        questionType: resolvedType,
        text: composeQuestionText(proseText("PASSAGE"), prompt),
        options:
          resolvedType === "GRID_IN" && !hasAnyOption
            ? []
            : OPTION_LABELS.map((label) => ({ label, text: singleLine(raw(label)) })),
        correctAnswer: resolvedType === "GRID_IN" ? answer : answer.toUpperCase(),
        explanation: stripEmojis(proseText("EXPLANATION")),
        category: singleLine(raw("CATEGORY")),
        difficulty: singleLine(raw("DIFFICULTY")).toUpperCase() as FullTestDifficulty,
      };

      if (!block.ended) blockErrors.push(`${prefix}: missing END QUESTION.`);
      blockErrors.push(...validateFullTestQuestion(question, effectiveSection, prefix));

      // A missing PROMPT is reported by both checks above; report it once.
      const unique = [...new Set(blockErrors)];
      errors.push(...unique);
      if (unique.length === 0) questions.push(question);
    });
  }

  return {
    section,
    questions: errors.length === 0 ? questions : [],
    errors,
    warnings: section ? moduleCountWarnings(section, questions) : [],
  };
};
