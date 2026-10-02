import { z } from "zod";
import {
  DIFFICULTIES,
  MODULE_TYPES,
  PAPER_STATUSES,
  QUESTION_TYPES,
  SECTIONS,
} from "@satsharks/types";

// ---------- auth ----------

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  // bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated.
  password: z.string().min(8).max(72),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");

// ---------- normalized import shapes (what the worker produces, what MongoDB stores) ----------

export const normalizedChoiceSchema = z.object({
  key: z.string().min(1),
  text: z.string(),
  viz: z.unknown().nullable(),
});

export const normalizedAssetSchema = z.object({
  kind: z.enum(["image"]),
  url: z.string().min(1),
  maxWidth: z.number().nullable(),
});

export const normalizedCorrectAnswerSchema = z.object({
  // Set for multiple choice.
  choiceKey: z.string().nullable(),
  // Set for student-produced responses; every accepted form of the answer.
  acceptedValues: z.array(z.string()),
});

export const normalizedQuestionSchema = z.object({
  source: z.string().min(1),
  sourceQuestionId: z.string().min(1),
  section: z.enum(SECTIONS),
  moduleNumber: z.union([z.literal(1), z.literal(2)]).nullable(),
  moduleType: z.enum(MODULE_TYPES),
  questionNumber: z.number().int().positive(),
  questionType: z.enum(QUESTION_TYPES),
  difficulty: z.enum(DIFFICULTIES).nullable(),
  topic: z.string().nullable(),
  skill: z.string().nullable(),
  prompt: z.string().min(1),
  passage: z.string().nullable(),
  choices: z.array(normalizedChoiceSchema),
  correctAnswer: normalizedCorrectAnswerSchema.nullable(),
  explanation: z.string().nullable(),
  assets: z.array(normalizedAssetSchema),
  viz: z.unknown().nullable(),
  sourceMetadata: z.record(z.unknown()),
});
export type NormalizedQuestion = z.infer<typeof normalizedQuestionSchema>;

export const normalizedModuleSchema = z.object({
  key: z.string().min(1),
  section: z.enum(SECTIONS),
  moduleNumber: z.union([z.literal(1), z.literal(2)]).nullable(),
  moduleType: z.enum(MODULE_TYPES),
  questionCount: z.number().int().nonnegative(),
  timeLimitSeconds: z.number().int().positive().nullable(),
});

export const normalizedPaperSchema = z.object({
  source: z.string().min(1),
  sourcePaperId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  status: z.enum(PAPER_STATUSES),
  sections: z.array(z.enum(SECTIONS)).min(1),
  modules: z.array(normalizedModuleSchema).min(1),
  adaptive: z.object({
    isAdaptive: z.boolean(),
    routing: z.enum(["server_side", "client_side", "unknown"]),
    observedRoute: z.enum(MODULE_TYPES).nullable(),
    module1Correct: z.number().int().nonnegative().nullable(),
    routingThreshold: z.number().nullable(),
  }),
  questionCount: z.number().int().nonnegative(),
  metadata: z.record(z.unknown()),
  sourceMetadata: z.record(z.unknown()),
});
export type NormalizedPaper = z.infer<typeof normalizedPaperSchema>;

// ---------- practice ----------

export const createAttemptSchema = z.object({
  paperId: objectIdSchema,
  topics: z.array(z.string().min(1).max(100)).max(20).default([]),
  skills: z.array(z.string().min(1).max(100)).max(40).default([]),
  difficulty: z.enum(DIFFICULTIES).nullable().default(null),
  // null = every matching question, up to the server's cap.
  limit: z.number().int().min(1).max(200).nullable().default(null),
  timed: z.boolean().default(false),
  timeMinutes: z.number().int().min(1).max(600).nullable().default(null),
  excludeAnswered: z.boolean().default(false),
  name: z.string().trim().max(80).default(""),
});
export type CreateAttemptInput = z.infer<typeof createAttemptSchema>;

export const saveAnswerSchema = z
  .object({
    answer: z.string().trim().max(200).nullable().optional(),
    flagged: z.boolean().optional(),
  })
  .refine((value) => value.answer !== undefined || value.flagged !== undefined, "Nothing to save");
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;

export const positionSchema = z.coerce.number().int().min(1).max(1000);

// ---------- admin ----------

export const paperStatusSchema = z.object({ status: z.enum(PAPER_STATUSES) });

export const bulkPaperStatusSchema = z.object({
  status: z.enum(PAPER_STATUSES),
  // Omit to apply to every paper.
  ids: z.array(objectIdSchema).min(1).max(500).optional(),
});

const optionalFilter = z.preprocess((value) => (value === "" ? undefined : value), z.string().max(100).optional());

export const questionListQuerySchema = z.object({
  section: z.preprocess((value) => (value === "" ? undefined : value), z.enum(SECTIONS).optional()),
  status: z.preprocess((value) => (value === "" ? undefined : value), z.enum(PAPER_STATUSES).optional()),
  // "none" selects questions with no difficulty.
  difficulty: z.preprocess((value) => (value === "" ? undefined : value), z.enum([...DIFFICULTIES, "none"]).optional()),
  topic: optionalFilter,
  skill: optionalFilter,
  paperId: z.preprocess((value) => (value === "" ? undefined : value), objectIdSchema.optional()),
  search: optionalFilter,
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type QuestionListQuery = z.infer<typeof questionListQuerySchema>;

export const updateQuestionSchema = z
  .object({
    difficulty: z.enum(DIFFICULTIES).nullable(),
    topic: z.string().trim().max(100).nullable(),
    skill: z.string().trim().max(100).nullable(),
    prompt: z.string().trim().min(1).max(20000),
    passage: z.string().max(20000).nullable(),
    explanation: z.string().max(20000).nullable(),
    correctAnswer: normalizedCorrectAnswerSchema.nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Nothing to update");
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
