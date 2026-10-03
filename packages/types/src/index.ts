// Shared enums and DTOs. Kept free of runtime dependencies so the web app can import it.

export const USER_ROLES = ["student", "staff", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["active", "blocked", "deleted"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PERMISSIONS = [
  "admin:access",
  "papers:read",
  "papers:write",
  "questions:read",
  "questions:write",
  "users:read",
  "users:write",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// Single place where roles map to permissions. Routes check permissions, never role names.
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  student: [],
  staff: ["admin:access", "papers:read", "questions:read"],
  admin: PERMISSIONS,
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const PAPER_STATUSES = ["draft", "published", "hidden"] as const;
export type PaperStatus = (typeof PAPER_STATUSES)[number];

export const SECTIONS = ["reading_writing", "math"] as const;
export type Section = (typeof SECTIONS)[number];

export const SECTION_LABELS: Record<Section, string> = {
  reading_writing: "Reading & Writing",
  math: "Math",
};

// m1 = routing module; m2_easy / m2_hard = the two second-stage routes.
// "none" = the question is not part of a module (a question-bank paper, e.g. imported from a drill).
// "unknown" = it belongs to a module, but the source did not expose which one.
export const MODULE_TYPES = ["m1", "m2_easy", "m2_hard", "none", "unknown"] as const;
export type ModuleType = (typeof MODULE_TYPES)[number];

export const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  m1: "Module 1",
  m2_easy: "Module 2 (easier)",
  m2_hard: "Module 2 (harder)",
  none: "No module (question set)",
  unknown: "Unknown module",
};

// spr = student-produced response (grid-in).
export const QUESTION_TYPES = ["mcq", "spr", "other"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const ATTEMPT_STATUSES = ["active", "done"] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const ATTEMPT_KINDS = ["drill", "mock"] as const;
export type AttemptKind = (typeof ATTEMPT_KINDS)[number];

// The modules of an adaptive mock section.
export type MockModule = "m1" | "m2_easy" | "m2_hard";

export const MOCK_MODULE_LABELS: Record<MockModule, string> = {
  m1: "Module 1",
  m2_easy: "Module 2 (easier)",
  m2_hard: "Module 2 (harder)",
};

// Size and time of each module of an adaptive mock, per section (the Digital SAT format).
export const MOCK_FORMAT: Record<"math" | "reading_writing", { questionsPerModule: number; minutesPerModule: number }> = {
  math: { questionsPerModule: 22, minutesPerModule: 35 },
  reading_writing: { questionsPerModule: 27, minutesPerModule: 32 },
};

// Default share of Module 1 a student must get right to be given the harder Module 2.
// The live value is an admin setting.
export const DEFAULT_ROUTING_THRESHOLD_PERCENT = 65;

export interface AdaptiveSettings {
  routingThresholdPercent: number;
}

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  permissions: Permission[];
}

export interface PaperModule {
  key: string;
  section: Section;
  moduleNumber: 1 | 2 | null;
  moduleType: ModuleType;
  questionCount: number;
  timeLimitSeconds: number | null;
}

export interface PaperAdaptiveInfo {
  isAdaptive: boolean;
  // Where the module-2 decision is made, as observed at the source.
  routing: "server_side" | "client_side" | "unknown";
  observedRoute: ModuleType | null;
  module1Correct: number | null;
  // Stays null unless the source explicitly exposes its rule.
  routingThreshold: number | null;
}

export interface PaperSummary {
  id: string;
  title: string;
  description: string | null;
  source: string;
  sourcePaperId: string;
  status: PaperStatus;
  sections: Section[];
  modules: PaperModule[];
  adaptive: PaperAdaptiveInfo;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionListItem {
  id: string;
  section: Section;
  moduleNumber: 1 | 2 | null;
  moduleType: ModuleType;
  questionNumber: number;
  questionType: QuestionType;
  difficulty: Difficulty | null;
  topic: string | null;
  skill: string | null;
  prompt: string;
  hasCorrectAnswer: boolean;
}

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

// ---------- practice (student-facing) ----------

export interface CatalogExam {
  examId: string;
  name: string;
  examDate: string | null;
  sections: Partial<Record<Section, { paperId: string; questionCount: number }>>;
}

export interface CatalogTopic {
  topic: string;
  skills: string[];
}

export interface PracticeCatalog {
  exams: CatalogExam[];
  topics: Record<Section, CatalogTopic[]>;
}

export interface AttemptSummary {
  id: string;
  kind: AttemptKind;
  name: string;
  section: Section;
  paperTitle: string;
  // Adaptive mocks only (null for drills).
  mock: {
    currentModule: "m1" | "m2" | null;
    m2Type: "m2_easy" | "m2_hard" | null;
    // Positions of the current module run from moduleStart to moduleStart + moduleQuestionCount - 1.
    moduleStart: number;
    moduleQuestionCount: number;
    m1Correct: number | null;
    m2Correct: number | null;
    m1Total: number;
    m2Total: number;
    routingRequiredCorrect: number | null;
  } | null;
  status: AttemptStatus;
  timed: boolean;
  timeLimitSeconds: number | null;
  // Computed by the server on every response; null for untimed attempts.
  timeRemainingSeconds: number | null;
  lastPosition: number;
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  createdAt: string;
  completedAt: string | null;
}

export interface AttemptNavItem {
  position: number;
  answered: boolean;
  flagged: boolean;
  checked: boolean;
}

export interface QuestionChoiceView {
  key: string;
  text: string;
  viz: unknown;
}

export interface QuestionAssetView {
  kind: "image";
  url: string;
  maxWidth: number | null;
}

export interface CorrectAnswerView {
  choiceKey: string | null;
  acceptedValues: string[];
}

// The answer key is only present once the student has checked the question or ended the attempt.
export interface QuestionResult {
  correct: boolean | null;
  correctAnswer: CorrectAnswerView | null;
  explanation: string | null;
}

export interface AttemptQuestion {
  position: number;
  // Adaptive mocks only.
  module: MockModule | null;
  section: Section;
  questionType: QuestionType;
  prompt: string;
  passage: string | null;
  choices: QuestionChoiceView[];
  assets: QuestionAssetView[];
  viz: unknown;
  answer: string | null;
  flagged: boolean;
  checked: boolean;
  result: QuestionResult | null;
}

export interface ReviewQuestion extends AttemptQuestion {
  topic: string | null;
  skill: string | null;
  difficulty: Difficulty | null;
  result: QuestionResult;
}

// ---------- admin question bank ----------

export interface AdminQuestion {
  id: string;
  paperId: string;
  paperTitle: string | null;
  sourceQuestionId: string;
  section: Section;
  questionNumber: number;
  questionType: QuestionType;
  difficulty: Difficulty | null;
  topic: string | null;
  skill: string | null;
  status: PaperStatus;
  prompt: string;
  passage: string | null;
  choices: QuestionChoiceView[];
  assets: QuestionAssetView[];
  viz: unknown;
  correctAnswer: CorrectAnswerView | null;
  explanation: string | null;
}

export interface AdminStats {
  users: number;
  papers: Record<PaperStatus, number>;
  questions: Record<PaperStatus, number>;
  questionsBySection: Record<Section, number>;
  attempts: number;
}
