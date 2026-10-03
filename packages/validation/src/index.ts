import { z } from "zod";
import {
  DIFFICULTIES,
  isCountryCode,
  MODULE_TYPES,
  PAPER_STATUSES,
  QUESTION_TYPES,
  REPORT_REASONS,
  REPORT_STATUSES,
  SECTION_SCORE_MAX,
  SECTION_SCORE_MIN,
  SECTIONS,
  sectionQuestionCount,
  TIME_MULTIPLIERS,
  PAID_PLANS,
  USER_PLANS,
  USER_REGIONS,
  USER_ROLES,
  USER_STATUSES,
  type Section,
} from "@satsharks/types";

// ---------- auth ----------

const emailSchema = z.string().trim().toLowerCase().email().max(254);
// bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated.
const newPasswordSchema = z.string().min(8, "Use at least 8 characters").max(72, "Use at most 72 characters");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: newPasswordSchema,
  country: z
    .string()
    .trim()
    .toUpperCase()
    .refine(isCountryCode, "Choose your country from the list"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// The token is 32 random bytes in base64url (43 characters).
const resetTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "This reset link is not valid");

export const resetTokenCheckSchema = z.object({ token: resetTokenSchema });

export const resetPasswordSchema = z.object({ token: resetTokenSchema, password: newPasswordSchema });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

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

const timeMultiplierSchema = z
  .number()
  .refine((value) => (TIME_MULTIPLIERS as readonly number[]).includes(value), "Extended time must be 1, 1.5 or 2")
  .default(1);

export const createMockSchema = z.object({
  section: z.enum(SECTIONS),
  // Exams to draw from. Empty = every published exam with that section.
  paperIds: z.array(objectIdSchema).max(100).default([]),
  // The official module countdown. Off = untimed.
  timed: z.boolean().default(true),
  // Extended-time accommodation (1.5× or 2× every module).
  timeMultiplier: timeMultiplierSchema,
  name: z.string().trim().max(80).default(""),
});
export type CreateMockInput = z.infer<typeof createMockSchema>;

// Both sections in one sitting: Reading & Writing, a break, then Math.
export const createFullTestSchema = z.object({
  // Exams to draw from, per section. Empty = every published exam with that section.
  paperIds: z
    .object({
      reading_writing: z.array(objectIdSchema).max(100).default([]),
      math: z.array(objectIdSchema).max(100).default([]),
    })
    .default({}),
  timed: z.boolean().default(true),
  timeMultiplier: timeMultiplierSchema,
  name: z.string().trim().max(80).default(""),
});
export type CreateFullTestInput = z.infer<typeof createFullTestSchema>;

export const adaptiveSettingsSchema = z.object({
  routingThresholdPercent: z.number().int().min(1).max(100),
});

// One raw-to-scaled table: entry n is the score for n correct. Scores only go up (or stay the same)
// as the raw count rises, and the Digital SAT reports them in steps of 10.
function conversionTableSchema(section: Section) {
  const entries = sectionQuestionCount(section) + 1;
  return z
    .array(z.number().int().min(SECTION_SCORE_MIN).max(SECTION_SCORE_MAX).multipleOf(10, "Scores go up in steps of 10"))
    .length(entries, `Enter exactly ${entries} scores (0 to ${entries - 1} correct)`)
    .refine((scores) => scores.every((score, index) => index === 0 || score >= scores[index - 1]!), "Scores must never go down as more answers are correct")
    .nullable();
}

export const conversionTablesSchema = z.object({
  reading_writing: z.object({ m2_easy: conversionTableSchema("reading_writing"), m2_hard: conversionTableSchema("reading_writing") }),
  math: z.object({ m2_easy: conversionTableSchema("math"), m2_hard: conversionTableSchema("math") }),
});

// ---------- problem reports ----------

export const createReportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).default(""),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const reportListQuerySchema = z.object({
  status: z.preprocess((value) => (value === "" ? undefined : value), z.enum(REPORT_STATUSES).optional()),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const resolveReportSchema = z.object({
  note: z.string().trim().max(1000).default(""),
  // Also close every other pending report about the same question.
  includeSameQuestion: z.boolean().default(false),
});

export const reopenReportSchema = z.object({ note: z.string().trim().max(1000).default("") });

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

// ---------- admin: users ----------

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const userListQuerySchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  // "paid" / "free" use the effective plan (an expired paid plan counts as free).
  plan: z.preprocess(emptyToUndefined, z.enum(USER_PLANS).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(USER_STATUSES).optional()),
  region: z.preprocess(emptyToUndefined, z.enum([...USER_REGIONS, "unknown"]).optional()),
  role: z.preprocess(emptyToUndefined, z.enum(USER_ROLES).optional()),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const updateUserSchema = z
  .object({
    plan: z.enum(USER_PLANS),
    paidPlan: z.enum(PAID_PLANS).nullable(),
    // ISO date (YYYY-MM-DD); null = no end date.
    planExpiresAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-12-31")
      .nullable(),
    status: z.enum(USER_STATUSES),
    role: z.enum(USER_ROLES),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Nothing to update");
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
