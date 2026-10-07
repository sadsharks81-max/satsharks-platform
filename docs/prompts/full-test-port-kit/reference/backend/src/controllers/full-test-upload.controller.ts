import { Request, Response } from "express";
import mongoose from "mongoose";
import { PDFParse } from "pdf-parse";
import FullTestUpload, {
  type IFullTestUploadQuestion,
  type IFullTestUploadSection,
} from "../models/FullTestUpload";
import Question from "../models/Question";
import QuestionCategory from "../models/QuestionCategory";
import SATTest from "../models/SATTest";
import { AuthRequest } from "../middleware/auth.middleware";
import { sendError } from "../utils/http";
import { stripEmojis } from "../utils/text";
import { FULL_TEST_QUESTION_TAG, fullTestQuestionTag } from "../utils/question-tags";
import {
  FULL_TEST_DIFFICULTIES,
  FULL_TEST_MODULE_SLOTS,
  FULL_TEST_SECTIONS,
  MODULE_SLOT_LABELS,
  moduleCountWarnings,
  parseFullTestSectionDocument,
  validateFullTestQuestion,
  type FullTestModuleSlot,
  type FullTestSection,
} from "../utils/full-test-parser";

const SECTION_FIELDS = { READING_WRITING: "readingWriting", MATH: "math" } as const;
const SECTION_LABELS: Record<FullTestSection, string> = { READING_WRITING: "English (Reading & Writing)", MATH: "Math" };
const MODULE_NAMES: Record<FullTestSection, Record<FullTestModuleSlot, string>> = {
  READING_WRITING: {
    MODULE_1: "Reading & Writing Module 1",
    MODULE_2_EASY: "Reading & Writing Module 2 - Easier",
    MODULE_2_HARD: "Reading & Writing Module 2 - Harder",
  },
  MATH: {
    MODULE_1: "Math Module 1",
    MODULE_2_EASY: "Math Module 2 - Easier",
    MODULE_2_HARD: "Math Module 2 - Harder",
  },
};
const MODULE_TIME_LIMIT_MINUTES: Record<FullTestSection, number> = { READING_WRITING: 32, MATH: 35 };
const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const MAX_LISTED_ERRORS = 15;
const MAX_REVIEW_QUESTIONS = 300;
// 9999 marks student-generated custom tests, which the admin test list hides.
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

type CategoryInfo = { _id: mongoose.Types.ObjectId; name: string; section: FullTestSection };

const parseSection = (value: unknown): FullTestSection | null =>
  FULL_TEST_SECTIONS.includes(value as FullTestSection) ? (value as FullTestSection) : null;

const loadCategoryMap = async () => {
  const categories = await QuestionCategory.find().select("name section").lean<CategoryInfo[]>();
  return new Map(categories.map((category) => [category.name.trim().toLowerCase(), category]));
};

const categoryErrors = (
  questions: Pick<IFullTestUploadQuestion, "moduleSlot" | "questionNumber" | "category">[],
  section: FullTestSection,
  categoryMap: Map<string, CategoryInfo>,
) =>
  questions.flatMap((question) => {
    const prefix = `${MODULE_SLOT_LABELS[question.moduleSlot]} question ${question.questionNumber}`;
    const category = categoryMap.get(question.category.trim().toLowerCase());
    if (!category) return [`${prefix}: CATEGORY "${question.category}" does not exist in the question bank.`];
    if (category.section !== section) {
      return [`${prefix}: CATEGORY "${category.name}" belongs to ${category.section}, not ${section}.`];
    }
    return [];
  });

const formatErrors = (heading: string, errors: string[]) =>
  [
    heading,
    ...errors.slice(0, MAX_LISTED_ERRORS).map((message) => `• ${message}`),
    ...(errors.length > MAX_LISTED_ERRORS ? [`• ${errors.length - MAX_LISTED_ERRORS} more error(s).`] : []),
  ].join("\n");

const readPdfText = async (buffer: Buffer) => {
  const parser = new PDFParse({ data: buffer });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
};

/** Parses one uploaded section PDF into a stored section (never throws for bad PDFs). */
const extractSection = async (
  file: Express.Multer.File,
  expectedSection: FullTestSection,
): Promise<IFullTestUploadSection> => {
  const base = {
    fileName: file.originalname.slice(0, 255),
    fileSize: file.size,
    uploadedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
  };
  const failed = (errorMessage: string): IFullTestUploadSection => ({
    ...base,
    status: "FAILED",
    errorMessage,
    warnings: [],
    questions: [],
  });

  let text: string;
  try {
    text = await readPdfText(file.buffer);
  } catch {
    return failed("This PDF could not be read. Export it again as a text-based PDF (not a scan).");
  }

  const parsed = parseFullTestSectionDocument(text);
  const errors = [...parsed.errors];
  if (parsed.section && parsed.section !== expectedSection) {
    errors.unshift(
      `This file says SECTION: ${parsed.section}, but it was uploaded as the ${SECTION_LABELS[expectedSection]} file.`,
    );
  }

  let questions = parsed.questions;
  if (errors.length === 0) {
    const categoryMap = await loadCategoryMap();
    errors.push(...categoryErrors(questions, expectedSection, categoryMap));
    questions = questions.map((question) => ({
      ...question,
      category: categoryMap.get(question.category.trim().toLowerCase())?.name ?? question.category,
    }));
  }

  if (errors.length > 0) {
    return failed(formatErrors(`The ${SECTION_LABELS[expectedSection]} PDF does not match the required format:`, errors));
  }
  return { ...base, status: "EXTRACTED", errorMessage: "", warnings: parsed.warnings, questions };
};

const parseYearAndNumber = (body: Record<string, unknown>) => {
  const year = Number(body.year);
  const testNumber = Number(body.testNumber);
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return { error: `Year must be a whole number between ${MIN_YEAR} and ${MAX_YEAR}.` };
  }
  if (!Number.isInteger(testNumber) || testNumber < 1 || testNumber > 100000) {
    return { error: "Test number must be a positive whole number." };
  }
  return { year, testNumber };
};

/** Question bodies are dropped from list responses; only per-module counts are kept. */
const summarizeSection = (section: IFullTestUploadSection | null | undefined) => {
  if (!section) return null;
  const { questions, ...rest } = section;
  const moduleCounts = Object.fromEntries(
    FULL_TEST_MODULE_SLOTS.map((slot) => [slot, (questions || []).filter((q) => q.moduleSlot === slot).length]),
  );
  return { ...rest, questionCount: (questions || []).length, moduleCounts };
};

const summarizeUpload = (upload: Record<string, any>) => ({
  ...upload,
  readingWriting: summarizeSection(upload.readingWriting),
  math: summarizeSection(upload.math),
});

const findDuplicateTest = async (year: number, testNumber: number, excludeUploadId?: string) => {
  if (await SATTest.exists({ year, testNumber })) {
    return `A test with year ${year} and test number ${testNumber} already exists. Choose a different test number.`;
  }
  const draft = await FullTestUpload.exists({
    year,
    testNumber,
    status: "DRAFT",
    ...(excludeUploadId ? { _id: { $ne: excludeUploadId } } : {}),
  });
  return draft
    ? `Another full-test upload already uses year ${year} and test number ${testNumber}.`
    : null;
};

export const listFullTestUploads = async (_req: Request, res: Response) => {
  try {
    const uploads = await FullTestUpload.find()
      .select(
        "-readingWriting.questions.text -readingWriting.questions.options -readingWriting.questions.explanation " +
          "-math.questions.text -math.questions.options -math.questions.explanation",
      )
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.status(200).json({ success: true, uploads: uploads.map(summarizeUpload) });
  } catch (error) {
    sendError(res, error, "fullTestUpload.list");
  }
};

export const getFullTestUpload = async (req: Request, res: Response) => {
  try {
    const upload = await FullTestUpload.findById(req.params.id).populate("uploadedBy", "name email").lean();
    if (!upload) return res.status(404).json({ success: false, error: "Upload not found" });
    res.status(200).json({ success: true, upload });
  } catch (error) {
    sendError(res, error, "fullTestUpload.get");
  }
};

export const createFullTestUpload = async (req: AuthRequest, res: Response) => {
  try {
    const title = typeof req.body.title === "string" ? req.body.title.trim().slice(0, 200) : "";
    if (!title) return res.status(400).json({ success: false, error: "Title is required." });

    const parsedNumbers = parseYearAndNumber(req.body);
    if ("error" in parsedNumbers) return res.status(400).json({ success: false, error: parsedNumbers.error });
    const { year, testNumber } = parsedNumbers;

    const files = (req.files || {}) as Record<string, Express.Multer.File[] | undefined>;
    const readingWritingFile = files.readingWriting?.[0];
    const mathFile = files.math?.[0];
    if (!readingWritingFile && !mathFile) {
      return res.status(400).json({ success: false, error: "Choose the English PDF, the Math PDF, or both." });
    }

    const duplicate = await findDuplicateTest(year, testNumber);
    if (duplicate) return res.status(409).json({ success: false, error: duplicate });

    const [readingWriting, math] = await Promise.all([
      readingWritingFile ? extractSection(readingWritingFile, "READING_WRITING") : null,
      mathFile ? extractSection(mathFile, "MATH") : null,
    ]);

    const upload = await FullTestUpload.create({
      title,
      year,
      testNumber,
      readingWriting,
      math,
      uploadedBy: req.user?.userId,
    });
    res.status(201).json({ success: true, upload: summarizeUpload(upload.toObject()) });
  } catch (error) {
    sendError(res, error, "fullTestUpload.create");
  }
};

export const replaceFullTestSection = async (req: AuthRequest, res: Response) => {
  try {
    const section = parseSection(req.params.section);
    if (!section) return res.status(400).json({ success: false, error: "Unknown section." });
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: "PDF file is required." });

    const upload = await FullTestUpload.findById(req.params.id);
    if (!upload) return res.status(404).json({ success: false, error: "Upload not found" });
    if (upload.status === "PUBLISHED") {
      return res.status(409).json({ success: false, error: "This test is already published. Edit it in Test Management." });
    }

    upload.set(SECTION_FIELDS[section], await extractSection(file, section));
    await upload.save();
    res.status(200).json({ success: true, upload: summarizeUpload(upload.toObject()) });
  } catch (error) {
    sendError(res, error, "fullTestUpload.replaceSection");
  }
};

const asText = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

/** Normalises one reviewed question from the client; validation happens afterwards. */
const sanitizeReviewedQuestion = (raw: unknown): IFullTestUploadQuestion => {
  const item = (raw ?? {}) as Record<string, unknown>;
  const questionType = item.questionType === "GRID_IN" ? "GRID_IN" : "MULTIPLE_CHOICE";
  const rawOptions = Array.isArray(item.options) ? item.options : [];
  const answer = asText(item.correctAnswer, 200).trim();
  return {
    moduleSlot: FULL_TEST_MODULE_SLOTS.includes(item.moduleSlot as FullTestModuleSlot)
      ? (item.moduleSlot as FullTestModuleSlot)
      : "MODULE_1",
    questionNumber: 0,
    questionType,
    text: asText(item.text, 20000).trim(),
    options:
      questionType === "GRID_IN"
        ? []
        : OPTION_LABELS.map((label, index) => {
            const option = (rawOptions[index] ?? {}) as Record<string, unknown>;
            return { label, text: asText(option.text, 4000).trim() };
          }),
    correctAnswer: questionType === "GRID_IN" ? answer : answer.toUpperCase(),
    explanation: stripEmojis(asText(item.explanation, 20000)).trim(),
    category: asText(item.category, 200).trim(),
    difficulty: FULL_TEST_DIFFICULTIES.includes(item.difficulty as (typeof FULL_TEST_DIFFICULTIES)[number])
      ? (item.difficulty as string)
      : "",
  };
};

/** Shared by review save and publish so both enforce the same rules. */
const validateSectionQuestions = (
  section: FullTestSection,
  questions: IFullTestUploadQuestion[],
  categoryMap: Map<string, CategoryInfo>,
) => {
  const errors: string[] = [];
  for (const slot of FULL_TEST_MODULE_SLOTS) {
    if (!questions.some((question) => question.moduleSlot === slot)) {
      errors.push(`${MODULE_SLOT_LABELS[slot]} has no questions.`);
    }
  }
  for (const question of questions) {
    const prefix = `${MODULE_SLOT_LABELS[question.moduleSlot]} question ${question.questionNumber}`;
    errors.push(...validateFullTestQuestion(question, section, prefix));
  }
  errors.push(...categoryErrors(questions, section, categoryMap));
  return errors;
};

/** Numbers questions 1..n inside each module, in the order they were sent. */
const renumber = (questions: IFullTestUploadQuestion[]) => {
  const counters = new Map<FullTestModuleSlot, number>();
  return questions.map((question) => {
    const next = (counters.get(question.moduleSlot) ?? 0) + 1;
    counters.set(question.moduleSlot, next);
    return { ...question, questionNumber: next };
  });
};

export const saveFullTestSectionReview = async (req: AuthRequest, res: Response) => {
  try {
    const section = parseSection(req.params.section);
    if (!section) return res.status(400).json({ success: false, error: "Unknown section." });
    if (!Array.isArray(req.body.questions) || req.body.questions.length > MAX_REVIEW_QUESTIONS) {
      return res.status(400).json({ success: false, error: "questions must be an array of reviewed questions." });
    }

    const upload = await FullTestUpload.findById(req.params.id);
    if (!upload) return res.status(404).json({ success: false, error: "Upload not found" });
    if (upload.status === "PUBLISHED") {
      return res.status(409).json({ success: false, error: "This test is already published. Edit it in Test Management." });
    }
    const current = upload.get(SECTION_FIELDS[section]) as IFullTestUploadSection | null;
    if (!current || current.status === "FAILED") {
      return res.status(400).json({ success: false, error: `Upload a valid ${SECTION_LABELS[section]} PDF first.` });
    }

    const categoryMap = await loadCategoryMap();
    const questions = renumber(req.body.questions.map(sanitizeReviewedQuestion)).map((question) => ({
      ...question,
      category: categoryMap.get(question.category.toLowerCase())?.name ?? question.category,
    }));
    const errors = validateSectionQuestions(section, questions, categoryMap);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: formatErrors("Fix these questions before saving:", errors) });
    }

    current.status = "REVIEWED";
    current.errorMessage = "";
    current.warnings = moduleCountWarnings(section, questions);
    current.questions = questions;
    current.reviewedAt = new Date();
    current.reviewedBy = req.user?.userId ? new mongoose.Types.ObjectId(req.user.userId) : null;
    await upload.save();
    res.status(200).json({ success: true, upload: upload.toObject() });
  } catch (error) {
    sendError(res, error, "fullTestUpload.saveReview");
  }
};

export const publishFullTestUpload = async (req: AuthRequest, res: Response) => {
  try {
    const upload = await FullTestUpload.findById(req.params.id);
    if (!upload) return res.status(404).json({ success: false, error: "Upload not found" });
    if (upload.status === "PUBLISHED") {
      return res.status(409).json({ success: false, error: "This test has already been published." });
    }

    const sections = FULL_TEST_SECTIONS.map((section) => ({
      section,
      data: upload.get(SECTION_FIELDS[section]) as IFullTestUploadSection | null,
    }));
    const notReviewed = sections.filter(({ data }) => data?.status !== "REVIEWED");
    if (notReviewed.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Review and save ${notReviewed.map(({ section }) => SECTION_LABELS[section]).join(" and ")} before publishing.`,
      });
    }

    const duplicate = await findDuplicateTest(upload.year, upload.testNumber, String(upload._id));
    if (duplicate) return res.status(409).json({ success: false, error: duplicate });

    const categoryMap = await loadCategoryMap();
    const errors = sections.flatMap(({ section, data }) =>
      validateSectionQuestions(section, data!.questions, categoryMap).map(
        (message) => `${SECTION_LABELS[section]} ${message}`,
      ),
    );
    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: formatErrors("Fix these questions before publishing:", errors) });
    }

    const testId = new mongoose.Types.ObjectId();
    const tags = [FULL_TEST_QUESTION_TAG, fullTestQuestionTag(String(testId))];
    const questionDocs: Record<string, unknown>[] = [];
    // Module order is what the adaptive engine routes on:
    // 0 R&W M1, 1 R&W M2 easier, 2 R&W M2 harder, 3 Math M1, 4 Math M2 easier, 5 Math M2 harder.
    const modules = sections.flatMap(({ section, data }) =>
      FULL_TEST_MODULE_SLOTS.map((slot) => {
        const ids = data!.questions
          .filter((question) => question.moduleSlot === slot)
          .map((question) => {
            const _id = new mongoose.Types.ObjectId();
            questionDocs.push({
              _id,
              text: question.text,
              options:
                question.questionType === "GRID_IN"
                  ? []
                  : question.options.map(({ label, text }) => ({ label, text })),
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              category: categoryMap.get(question.category.toLowerCase())!._id,
              difficulty: question.difficulty,
              section,
              tags,
              source: "AI_EXTRACTED",
              status: "PUBLISHED",
              createdBy: req.user?.userId,
            });
            return _id;
          });
        return {
          name: MODULE_NAMES[section][slot],
          section,
          questions: ids,
          timeLimitMinutes: MODULE_TIME_LIMIT_MINUTES[section],
        };
      }),
    ).map((module, index) => ({ ...module, moduleNumber: index + 1 }));

    await Question.insertMany(questionDocs);
    try {
      await SATTest.create({
        _id: testId,
        title: upload.title,
        description: `Adaptive Digital SAT practice test #${upload.testNumber}.`,
        year: upload.year,
        testNumber: upload.testNumber,
        isAdaptive: true,
        // Hidden until the admin adds graphs/images and activates it in Test Management.
        isActive: false,
        breakDurationMinutes: 10,
        modules,
        createdBy: req.user?.userId,
      });
    } catch (error) {
      // No transaction here: undo the inserted questions so a failed publish
      // (e.g. a concurrent publish taking the same year/number) leaves nothing behind.
      await Question.deleteMany({ _id: { $in: questionDocs.map((doc) => doc._id) } });
      throw error;
    }

    upload.status = "PUBLISHED";
    upload.publishedTest = testId;
    upload.publishedAt = new Date();
    await upload.save();

    res.status(200).json({ success: true, testId, questionCount: questionDocs.length });
  } catch (error) {
    sendError(res, error, "fullTestUpload.publish");
  }
};

export const deleteFullTestUpload = async (req: Request, res: Response) => {
  try {
    // Deleting the upload record never deletes a published test; that lives in
    // Test Management.
    const upload = await FullTestUpload.findByIdAndDelete(req.params.id);
    if (!upload) return res.status(404).json({ success: false, error: "Upload not found" });
    res.status(200).json({ success: true, message: "Upload deleted" });
  } catch (error) {
    sendError(res, error, "fullTestUpload.delete");
  }
};
