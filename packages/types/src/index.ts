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
  "reports:read",
  "reports:write",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// Single place where roles map to permissions. Routes check permissions, never role names.
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  student: [],
  staff: ["admin:access", "papers:read", "questions:read", "reports:read"],
  admin: PERMISSIONS,
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// Local = Pakistan (PKR plans), International = everywhere else (USD plans). Decided only by the
// country the student picks at sign-up, never by IP address.
export const USER_REGIONS = ["local", "international"] as const;
export type UserRegion = (typeof USER_REGIONS)[number];

export const USER_REGION_LABELS: Record<UserRegion, string> = {
  local: "Local (Pakistan)",
  international: "International",
};

export const LOCAL_COUNTRY_CODE = "PK";

// Free or paid access. Set by an admin for now; payments (proposal Checkpoint 4.1) will set it too.
export const USER_PLANS = ["free", "paid"] as const;
export type UserPlan = (typeof USER_PLANS)[number];

// The paid plans on the pricing page.
export const PAID_PLANS = ["monthly", "three_months", "till_test_day"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

export const PAID_PLAN_LABELS: Record<PaidPlan, string> = {
  monthly: "Monthly",
  three_months: "3 Months",
  till_test_day: "Till Test Day",
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: "Active",
  blocked: "Disabled",
  deleted: "Deleted",
};

// ISO 3166-1 alpha-2 codes. Names are shown with Intl.DisplayNames in the browser.
export const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
  "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
  "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
  "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
  "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
  "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
  "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
  "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
  "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export function isCountryCode(value: string): value is CountryCode {
  return (COUNTRY_CODES as readonly string[]).includes(value);
}

export function regionForCountry(country: string): UserRegion {
  return country === LOCAL_COUNTRY_CODE ? "local" : "international";
}

export const PAPER_STATUSES =["draft", "published", "hidden"] as const;
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

export const MOCK_MODULES: readonly MockModule[] = ["m1", "m2_easy", "m2_hard"];

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

// Extended-time accommodations: every module's time limit is multiplied by this.
export const TIME_MULTIPLIERS = [1, 1.5, 2] as const;
export type TimeMultiplier = (typeof TIME_MULTIPLIERS)[number];

// Minutes of break between Reading & Writing and Math in a full test.
export const FULL_TEST_BREAK_MINUTES = 10;

// ---------- scoring ----------

export const SECTION_SCORE_MIN = 200;
export const SECTION_SCORE_MAX = 800;

// Raw-to-scaled conversion: scores[n] is the section score for n correct answers over both
// modules, so each table has (questions in the section + 1) entries. The Digital SAT scores the
// same raw count differently after the easier and the harder Module 2, hence one table per route.
export type ScoreRoute = "m2_easy" | "m2_hard";
export const SCORE_ROUTES: readonly ScoreRoute[] = ["m2_easy", "m2_hard"];
export type ConversionTables = Record<Section, Record<ScoreRoute, number[] | null>>;

export function sectionQuestionCount(section: Section): number {
  return MOCK_FORMAT[section].questionsPerModule * 2;
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
  // ISO country code. null for accounts made before country was asked, and for admins made
  // from the command line.
  country: string | null;
  region: UserRegion | null;
  // Effective plan: a paid plan whose end date has passed counts as free.
  plan: UserPlan;
}

// ---------- admin: users ----------

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  country: string | null;
  region: UserRegion | null;
  // Effective plan (see PublicUser.plan) and what was set.
  plan: UserPlan;
  paidPlan: PaidPlan | null;
  planExpiresAt: string | null;
  createdAt: string;
}

export interface AdminUserActivity {
  drills: number;
  mocks: number;
  fullTests: number;
  completed: number;
  bestSectionScore: number | null;
  bestTotalScore: number | null;
  reports: number;
  lastActiveAt: string | null;
}

export type UserListCounts = { all: number; paid: number; free: number; blocked: number; deleted: number };

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
  // An uploaded exam, which can also be taken as a fixed full test.
  testUploadId: string | null;
  sections: Partial<Record<Section, { paperId: string; questionCount: number }>>;
  // Kept for paid accounts and this account is free (see Admin → Access).
  locked: boolean;
}

export interface CatalogTopic {
  topic: string;
  skills: string[];
}

export interface PracticeCatalog {
  exams: CatalogExam[];
  topics: Record<Section, CatalogTopic[]>;
  access: PracticeAccess;
}

export interface ModuleResult {
  module: "m1" | "m2";
  route: MockModule | null;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  // Measured by the server from the module's start to its submission. null for a module that has
  // not finished, and for attempts made before time was recorded.
  timeUsedSeconds: number | null;
  timeLimitSeconds: number | null;
}

export interface AttemptSummary {
  id: string;
  kind: AttemptKind;
  name: string;
  section: Section;
  paperTitle: string;
  // Set when this section is part of a full test (both sections in one sitting).
  fullTestId: string | null;
  timeMultiplier: TimeMultiplier;
  // 200–800. Finished adaptive mocks only, and only once the conversion table has been entered.
  sectionScore: number | null;
  // Whole attempt, by the server's clock. null while running and for older attempts.
  timeUsedSeconds: number | null;
  // Adaptive mocks: one entry per module reached. Drills: empty.
  modules: ModuleResult[];
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
  // Time the question was on screen, measured by the server between question loads.
  timeSpentSeconds: number;
}

// ---------- full test (Reading & Writing, break, Math) ----------

export type FullTestStage = "reading_writing" | "break" | "math" | "done";

export interface FullTestSummary {
  id: string;
  name: string;
  stage: FullTestStage;
  timed: boolean;
  timeMultiplier: TimeMultiplier;
  readingWriting: AttemptSummary | null;
  math: AttemptSummary | null;
  // When the break ends (stage "break" only).
  breakEndsAt: string | null;
  // 400–1600, once both section scores exist.
  totalScore: number | null;
  createdAt: string;
  completedAt: string | null;
}

// ---------- uploaded practice tests (a fixed adaptive test from two PDFs) ----------

// Papers made from an uploaded test, and their questions, carry this source.
export const TEST_UPLOAD_SOURCE = "pdf-upload";
// ...or this one when the upload is a real exam (shown under Exams, see TEST_UPLOAD_KINDS).
export const EXAM_UPLOAD_SOURCE = "pdf-upload-exam";
export const UPLOAD_SOURCES = [TEST_UPLOAD_SOURCE, EXAM_UPLOAD_SOURCE];

// Where an uploaded test goes. "practice": Full-Length Practice Tests on Home; its questions are
// used only in that test. "exam": a real administration (e.g. the December SAT), shown under Exams
// like the bank's exams (drills, random mocks) and also takeable as a fixed full test.
export const TEST_UPLOAD_KINDS = ["practice", "exam"] as const;
export type TestUploadKind = (typeof TEST_UPLOAD_KINDS)[number];

// Every question of an uploaded test carries this tag and the per-test one. Tagged questions belong
// to their test only: drills, random mocks and the practice catalog never draw from them.
export const FULL_TEST_QUESTION_TAG = "full-test";
export const fullTestQuestionTag = (uploadId: string) => `${FULL_TEST_QUESTION_TAG}:${uploadId}`;
// Questions of an uploaded exam carry this tag (and the per-test one) instead: they are bank
// questions, but their paper is still managed on the Full tests page.
export const UPLOADED_EXAM_QUESTION_TAG = "uploaded-exam";

export const UPLOAD_SECTION_STATUSES = ["extracted", "reviewed", "failed"] as const;
export type UploadSectionStatus = (typeof UPLOAD_SECTION_STATUSES)[number];

// One question as read from the PDF and edited in review, before it is published.
export interface UploadQuestion {
  module: MockModule;
  questionNumber: number;
  questionType: "mcq" | "spr";
  difficulty: Difficulty;
  // Domain, and optionally the skill, from the question bank's own vocabulary.
  topic: string;
  skill: string | null;
  passage: string | null;
  prompt: string;
  // A–D for multiple choice; empty for a student-produced response.
  choices: { key: string; text: string }[];
  choiceKey: string | null;
  acceptedValues: string[];
  explanation: string;
}

export interface TestUploadSection {
  fileName: string;
  fileSize: number;
  status: UploadSectionStatus;
  errorMessage: string;
  warnings: string[];
  uploadedAt: string;
  reviewedAt: string | null;
  moduleCounts: Record<MockModule, number>;
  questionCount: number;
  // Only on the single-upload response.
  questions?: UploadQuestion[];
}

export interface TestUploadSummary {
  id: string;
  kind: TestUploadKind;
  title: string;
  year: number;
  // Practice tests only; an exam's number is assigned automatically and not shown.
  testNumber: number;
  // Exams only: the administration date, YYYY-MM-DD.
  examDate: string | null;
  status: "draft" | "published";
  // Published tests only: students can see and start it.
  active: boolean;
  readingWriting: TestUploadSection | null;
  math: TestUploadSection | null;
  // The two papers created on publish.
  paperIds: Partial<Record<Section, string>>;
  publishedAt: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

// What a student sees of an active uploaded test.
export interface PracticeTestListing {
  id: string;
  kind: TestUploadKind;
  title: string;
  year: number;
  testNumber: number;
  moduleCounts: Record<Section, Record<MockModule, number>>;
  // Kept for paid accounts and this account is free.
  locked: boolean;
}

const MAX_SPR_LENGTH = 5;
const SPR_VALUE = /^-?(\d+\.?\d*|\.\d+)(\/\d+)?$/;

// Splits a written grid-in answer ("0.5 or 1/2", "3.5, 7/2") into its accepted forms.
export function splitAcceptedValues(answer: string): string[] {
  return answer
    .split(/\s+or\s+|\s*;\s*|,\s+/i)
    .map((value) => value.trim())
    .filter(Boolean);
}

// A student-produced response must be something the answer box lets a student type: digits, one
// decimal point or fraction bar, an optional minus, 5 characters (6 when negative).
export function sprValueProblem(value: string): string | null {
  if (!SPR_VALUE.test(value)) return `"${value}" cannot be typed in the answer box (digits, ".", "/" and "-" only)`;
  if (value.length > MAX_SPR_LENGTH + (value.startsWith("-") ? 1 : 0)) return `"${value}" is longer than the answer box allows`;
  return null;
}

// The "$…$" pieces of Math text, and whether every "$" is paired. "\$" is a literal dollar sign.
export function latexSegments(text: string): { segments: string[]; balanced: boolean; outside: string } {
  const segments: string[] = [];
  let outside = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index]!;
    if (char === "\\" && index + 1 < text.length) {
      outside += text.slice(index, index + 2);
      index += 2;
      continue;
    }
    if (char !== "$") {
      outside += char;
      index += 1;
      continue;
    }
    const display = text[index + 1] === "$";
    const open = display ? 2 : 1;
    let end = index + open;
    while (end < text.length) {
      if (text[end] === "\\") end += 2;
      else if (text[end] === "$" && (!display || text[end + 1] === "$")) break;
      else end += 1;
    }
    if (end >= text.length) return { segments, balanced: false, outside };
    segments.push(text.slice(index + open, end));
    index = end + open;
  }
  return { segments, balanced: true, outside };
}

// Checks one question against the upload rules. Shared by the PDF import, the review save, the
// publish step and the review screen, so all four agree. `checkLatex` returns KaTeX's message for
// a formula it cannot render, or null.
export function uploadQuestionProblems(
  question: UploadQuestion,
  section: Section,
  topics: CatalogTopic[],
  checkLatex?: (latex: string) => string | null,
): string[] {
  const problems: string[] = [];
  if (!question.prompt.trim()) problems.push("PROMPT is required");
  if (!question.explanation.trim()) problems.push("EXPLANATION is required");
  if (!DIFFICULTIES.includes(question.difficulty)) problems.push("DIFFICULTY must be EASY, MEDIUM or HARD");

  const topic = topics.find((entry) => entry.topic === question.topic);
  if (!topic) problems.push(`"${question.topic}" is not a ${SECTION_LABELS[section]} domain in the question bank`);
  else if (question.skill && !topic.skills.includes(question.skill)) problems.push(`"${question.skill}" is not a skill of ${topic.topic}`);

  if (question.questionType === "spr") {
    if (section !== "math") problems.push("GRID_IN is only allowed in Math");
    if (question.choices.some((choice) => choice.text.trim())) problems.push("a GRID_IN question has no A–D choices");
    if (question.acceptedValues.length === 0) problems.push("ANSWER is required");
    for (const value of question.acceptedValues) {
      const problem = sprValueProblem(value);
      if (problem) problems.push(problem);
    }
  } else {
    const keys = question.choices.map((choice) => choice.key).join("");
    if (keys !== "ABCD" || question.choices.some((choice) => !choice.text.trim())) {
      problems.push("choices A, B, C and D are all required (use TYPE: GRID_IN for a fill-in question)");
    }
    if (!question.choiceKey || !"ABCD".includes(question.choiceKey) || question.choiceKey.length !== 1) problems.push("ANSWER must be A, B, C or D");
  }

  if (section === "math") {
    const fields: [string, string | null][] = [
      ["PROMPT", question.prompt],
      ["PASSAGE", question.passage],
      ["EXPLANATION", question.explanation],
      ...question.choices.map((choice): [string, string] => [`choice ${choice.key}`, choice.text]),
    ];
    for (const [name, text] of fields) {
      if (!text) continue;
      const { segments, balanced } = latexSegments(text);
      if (!balanced) {
        problems.push(`${name} has a "$" with no closing "$" (write a dollar sign as \\$ inside $…$, e.g. $\\$78$)`);
        continue;
      }
      for (const latex of segments) {
        const error = checkLatex?.(latex);
        if (error) problems.push(`${name}: the formula $${latex}$ cannot be displayed (${error})`);
      }
    }
  }
  return problems;
}

// Math that was probably meant as a formula but is not inside $…$.
export function looseMathWarning(text: string): boolean {
  return /\^|\\(frac|sqrt|pi|times|le|ge|neq)\b/.test(latexSegments(text).outside);
}

// ---------- pricing (edited in Admin → Settings, shown on /pricing) ----------

export const CURRENCIES = ["PKR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

// The four plans are fixed (accounts store which one they have); their wording and prices are not.
export const PRICING_PLAN_IDS = ["free", ...PAID_PLANS] as const;
export type PricingPlanId = (typeof PRICING_PLAN_IDS)[number];

export interface PricingPlan {
  id: PricingPlanId;
  name: string;
  price: Record<Currency, string>;
  period: string;
  // "Save 22%" etc., per currency. null = no badge.
  saving: Record<Currency, string> | null;
  highlights: string[];
  popular: boolean;
}

export interface PricingComparisonRow {
  feature: string;
  free: string;
  paid: string;
}

export interface PricingContent {
  plans: PricingPlan[];
  comparison: PricingComparisonRow[];
  // One line under the plans.
  tagline: string;
  // One line under the comparison table.
  schoolsNote: string;
  // The payment terms line under the plans.
  refundPolicy: string;
}

// Plans and limits as written in the project proposal (v4.0, "Subscription plans" and "Free vs
// paid"), used until an admin saves their own.
export const DEFAULT_PRICING: PricingContent = {
  plans: [
    { id: "free", name: "Free", price: { PKR: "PKR 0", USD: "$0" }, period: "forever", saving: null, highlights: ["2 full papers", "20 drill questions a day", "Score only, no analysis"], popular: false },
    { id: "monthly", name: "Monthly", price: { PKR: "PKR 1,500", USD: "$12.99" }, period: "per month", saving: null, highlights: ["Everything unlocked", "Cancel any time"], popular: false },
    {
      id: "three_months",
      name: "3 Months",
      price: { PKR: "PKR 3,500", USD: "$29.99" },
      period: "per 3 months",
      saving: { PKR: "Save 22%", USD: "Save 23%" },
      highlights: ["Everything unlocked", "The normal prep window"],
      popular: true,
    },
    {
      id: "till_test_day",
      name: "Till Test Day",
      price: { PKR: "PKR 5,999", USD: "$49.99" },
      period: "per 6 months",
      saving: { PKR: "Save 33%", USD: "Save 36%" },
      highlights: ["Everything unlocked", "Covers the full run-up to the exam"],
      popular: false,
    },
  ],
  comparison: [
    { feature: "Full-length past papers", free: "2", paid: "Every paper, plus each new one" },
    { feature: "Drill questions", free: "20 per day", paid: "Unlimited" },
    { feature: "Question review with explanations", free: "Yes", paid: "Yes" },
    { feature: "Predicted SAT score", free: "Score only", paid: "Score, range and trend" },
    { feature: "Skills breakdown", free: "Top 3 weak areas", paid: "All topics and skills" },
    { feature: "Error pattern and timing analysis", free: "—", paid: "Yes" },
    { feature: "Mistake bank and retry queue", free: "Last 20 questions", paid: "Unlimited" },
    { feature: "Daily goals, streaks and leaderboard", free: "Yes", paid: "Yes" },
    { feature: "Streak freezes", free: "1 per month", paid: "3 per month" },
  ],
  tagline: "One hour with a tutor costs more than three months of SAT Sharks.",
  schoolsNote: "",
  refundPolicy: "All payments are final: SAT Sharks does not offer refunds.",
};

// ---------- access by plan (edited in Admin → Access) ----------

// "free": every account. "paid": accounts with an active paid plan (and staff/admins).
export const ACCESS_LEVELS = ["free", "paid"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

// Ways of practising that can be kept for paid accounts. Fixed tests (uploaded practice tests and
// uploaded exams taken whole) are set one by one instead, like exams.
export const ACCESS_FEATURES = ["drills", "mocks", "full_tests"] as const;
export type AccessFeature = (typeof ACCESS_FEATURES)[number];

export const ACCESS_FEATURE_LABELS: Record<AccessFeature, { label: string; description: string }> = {
  drills: { label: "Practice drills", description: "Question sets from one exam, with answer checks" },
  mocks: { label: "Adaptive section mocks", description: "One section in two modules, drawn from the exam pool" },
  full_tests: { label: "Adaptive full tests", description: "Both sections and a break, drawn from the exam pool" },
};

// An exam or uploaded test in the access rules is known by its catalog exam id. Everything uploaded
// on the Full tests page (exam or practice test) is "upload:<id>", which is also its exam id.
export const uploadAccessKey = (uploadId: string) => `upload:${uploadId}`;

export interface AccessRule {
  key: string;
  level: AccessLevel;
}

export interface AccessSettings {
  features: Record<AccessFeature, AccessLevel>;
  // Exams and uploaded tests set one by one. Rules for exams that are hidden right now are kept.
  content: AccessRule[];
  // For exams and tests without a rule: those that appeared after the last save.
  newContent: AccessLevel;
}

// Everything open until an admin saves their own, so existing accounts lose nothing on release.
export const DEFAULT_ACCESS: AccessSettings = {
  features: { drills: "free", mocks: "free", full_tests: "free" },
  content: [],
  newContent: "free",
};

export function contentAccessLevel(settings: AccessSettings, key: string): AccessLevel {
  return settings.content.find((rule) => rule.key === key)?.level ?? settings.newContent;
}

// One exam or uploaded test on the Access page.
export interface AccessItem {
  key: string;
  kind: "exam" | "practice";
  name: string;
  // Exams: the administration date (YYYY-MM-DD) when known.
  date: string | null;
  // Uploaded tests that are not active are not shown to students yet.
  active: boolean;
}

export interface AdminAccess {
  settings: AccessSettings;
  items: AccessItem[];
}

// What the signed-in account may use; sent with the practice catalog.
export interface PracticeAccess {
  // Paid plan, staff or admin.
  paid: boolean;
  features: Record<AccessFeature, boolean>;
}

// ---------- announcements (Admin → Announcements, shown as banners to students) ----------

// "free" / "paid" use the same rule as access: paid = an active paid plan.
export const ANNOUNCEMENT_AUDIENCES = ["all", "free", "paid"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: "All students",
  free: "Free accounts",
  paid: "Paid accounts",
};

export const ANNOUNCEMENT_TONES = ["info", "important"] as const;
export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number];

export interface Announcement {
  id: string;
  title: string;
  message: string;
  audience: AnnouncementAudience;
  tone: AnnouncementTone;
  // Off = kept as a draft or taken down.
  active: boolean;
  // Hidden after this moment (ISO); null = until turned off.
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- problem reports ----------

export const REPORT_REASONS = ["wrong_answer", "typo", "display", "explanation", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  wrong_answer: "The marked correct answer is wrong",
  typo: "Typo or unclear wording",
  display: "Image, graph, table or formula does not display correctly",
  explanation: "The explanation is wrong or missing",
  other: "Something else",
};

export const REPORT_STATUSES = ["pending", "resolved"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface ReportHistoryEntry {
  action: "created" | "resolved" | "reopened";
  at: string;
  byName: string | null;
  note: string | null;
  // Resolved only: the question had been edited after the report was made.
  questionEdited: boolean;
}

export interface AdminReport {
  id: string;
  status: ReportStatus;
  reason: ReportReason;
  details: string | null;
  questionId: string;
  question: { sourceQuestionId: string; section: Section; prompt: string; paperTitle: string | null } | null;
  reporter: { id: string; name: string; email: string } | null;
  // Where the student met the question.
  context: { attemptId: string | null; attemptName: string | null; kind: AttemptKind | null; position: number | null };
  history: ReportHistoryEntry[];
  createdAt: string;
  resolvedAt: string | null;
}

// ---------- admin question bank ----------

export interface AdminQuestion {
  id: string;
  paperId: string;
  paperTitle: string | null;
  // Set when the question belongs to an uploaded practice test.
  testUploadId: string | null;
  sourceQuestionId: string;
  section: Section;
  moduleType: ModuleType;
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
  usersByRegion: Record<UserRegion | "unknown", number>;
  paidUsers: number;
  reports: Record<ReportStatus, number>;
  papers: Record<PaperStatus, number>;
  questions: Record<PaperStatus, number>;
  questionsBySection: Record<Section, number>;
  attempts: number;
}
