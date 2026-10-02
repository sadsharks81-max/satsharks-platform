// Converts parsed Bluecorn data into SAT Sharks' own shapes.
// Rule: a value the source did not provide becomes null (or "unknown"). Nothing is guessed.
import {
  DIFFICULTIES,
  MODULE_TYPES,
  SECTION_LABELS,
  type Difficulty,
  type ModuleType,
  type QuestionType,
  type Section,
} from "@satsharks/types";
import type { NormalizedPaper, NormalizedQuestion } from "@satsharks/validation";
import type { ParsedAttempt } from "../parsers/bluecorn.parser";
import type { SourceQuestion } from "../source/bluecorn/question";

export interface NormalizedImport {
  paper: NormalizedPaper;
  questions: NormalizedQuestion[];
  // Things the source did not give us. Reported, never papered over.
  warnings: string[];
}

const SECTION_MAP: Record<string, Section> = { math: "math", rw: "reading_writing" };
const TYPE_MAP: Record<string, QuestionType> = { mcq: "mcq", grid_in: "spr", spr: "spr" };

const isModuleType = (value: string | null): value is ModuleType =>
  value !== null && (MODULE_TYPES as readonly string[]).includes(value);

function resolveModuleType(question: SourceQuestion, parsed: ParsedAttempt): ModuleType {
  // A drill is a flat question set: there are no modules to assign.
  if (parsed.attempt.kind === "drill") return "none";
  // 1. The review payload states it per question.
  if (isModuleType(question.moduleType) && question.moduleType !== "unknown") return question.moduleType;
  // 2. Otherwise: was it fetched before or after Module 1 was submitted?
  if (parsed.evidence.module1EndObserved && question.seenAfterModule1End !== null) {
    if (!question.seenAfterModule1End) return "m1";
    return isModuleType(parsed.attempt.m2Type) ? parsed.attempt.m2Type : "unknown";
  }
  return "unknown";
}

const moduleNumberOf = (moduleType: ModuleType): 1 | 2 | null =>
  moduleType === "m1" ? 1 : moduleType === "m2_easy" || moduleType === "m2_hard" ? 2 : null;

// Question payloads carry no difficulty, domain or skill. The only way to know one is when the
// drill was created with a filter that pins it to a single value: then every question in the
// drill has that value, because the source selected them by it.
function labelsFromFilter(parsed: ParsedAttempt): QuestionLabels {
  const filter = parsed.attempt.filter;
  const difficulty = filter?.difficulty?.toLowerCase() ?? null;
  return {
    difficulty: (DIFFICULTIES as readonly string[]).includes(difficulty ?? "") ? (difficulty as Difficulty) : null,
    topic: filter?.domains.length === 1 ? filter.domains[0]! : null,
    skill: filter?.skills.length === 1 ? filter.skills[0]! : null,
  };
}

export interface QuestionLabels {
  difficulty: Difficulty | null;
  topic: string | null;
  skill: string | null;
}

export interface QuestionContext {
  sourceName: string;
  // Used when the question itself does not state its section.
  fallbackSection: Section | undefined;
  moduleType: ModuleType;
  questionNumber: number;
  labels: QuestionLabels;
  sourceMetadata: Record<string, unknown>;
  warnings: string[];
}

export const toSection = (value: string | null): Section | undefined => (value ? SECTION_MAP[value] : undefined);

// One source question -> one SAT Sharks question. Shared by every Bluecorn import path.
export function buildQuestion(question: SourceQuestion, context: QuestionContext): NormalizedQuestion {
  const { warnings } = context;
  const section = toSection(question.section) ?? context.fallbackSection;
  const questionType = (question.type ? TYPE_MAP[question.type] : undefined) ?? "other";
  const label = `question ${question.contentId ?? question.attemptQuestionId ?? "?"}`;

  if (!section) warnings.push(`${label}: section "${question.section}" is not recognised`);
  if (questionType === "other") warnings.push(`${label}: question type "${question.type}" is not recognised`);
  if (!question.contentId) warnings.push(`${label}: no stable source ID (content_id); using the per-attempt ID`);
  if (!question.prompt) warnings.push(`${label}: content was not captured (the question was never opened and is not in the results)`);

  const choices = question.options.map((option, index) => ({
    key: String.fromCharCode(65 + index),
    text: option.text,
    viz: option.viz,
  }));

  let correctAnswer: NormalizedQuestion["correctAnswer"] = null;
  if (questionType === "mcq" && question.correctIndex !== null) {
    correctAnswer = { choiceKey: String.fromCharCode(65 + question.correctIndex), acceptedValues: [] };
  } else if (questionType !== "mcq" && question.correctValues) {
    correctAnswer = { choiceKey: null, acceptedValues: question.correctValues };
  }

  return {
    source: context.sourceName,
    sourceQuestionId: question.contentId ?? `attempt-question:${question.attemptQuestionId ?? "missing"}`,
    // Falls through to schema validation as an error if the section is unknown.
    section: section as Section,
    moduleNumber: moduleNumberOf(context.moduleType),
    moduleType: context.moduleType,
    questionNumber: context.questionNumber,
    questionType,
    ...context.labels,
    prompt: question.prompt ?? "",
    passage: question.passage,
    choices,
    correctAnswer,
    explanation: question.explanation,
    assets: question.imageUrl ? [{ kind: "image", url: question.imageUrl, maxWidth: question.imageMaxWidth }] : [],
    viz: question.viz,
    sourceMetadata: {
      contentId: question.contentId,
      attemptQuestionId: question.attemptQuestionId,
      sourceType: question.type,
      ...context.sourceMetadata,
    },
  };
}

export function normalizeBluecornAttempt(parsed: ParsedAttempt, sourceName: string): NormalizedImport {
  const warnings: string[] = [];
  const { attempt } = parsed;
  const isMock = attempt.kind === "mock";
  const attemptSection = toSection(attempt.section);
  const labels = labelsFromFilter(parsed);

  if (attempt.filter?.difficulty && labels.difficulty === null) {
    warnings.push(`Drill difficulty filter "${attempt.filter.difficulty}" is not a recognised difficulty; left as null`);
  }

  const questions: NormalizedQuestion[] = parsed.questions.map((question) =>
    buildQuestion(question, {
      sourceName,
      fallbackSection: attemptSection,
      moduleType: resolveModuleType(question, parsed),
      questionNumber: question.position ?? 0,
      labels,
      warnings,
      sourceMetadata: {
        attemptId: attempt.id,
        attemptKind: attempt.kind,
        examIds: attempt.examIds,
        position: question.position,
        sourceModuleType: question.moduleType,
        seenInResult: question.inResult,
      },
    }),
  );

  questions.sort(
    (a, b) => (a.moduleNumber ?? 3) - (b.moduleNumber ?? 3) || a.questionNumber - b.questionNumber,
  );

  const sections = [...new Set(questions.map((q) => q.section).filter(Boolean))];
  const moduleKeys = [...new Set(questions.map((q) => `${q.section}:${q.moduleType}`))];
  const modules = moduleKeys.map((key) => {
    const inModule = questions.filter((q) => `${q.section}:${q.moduleType}` === key);
    const first = inModule[0]!;
    return {
      key: `${first.section}-${first.moduleType}`,
      section: first.section,
      moduleNumber: first.moduleNumber,
      moduleType: first.moduleType,
      questionCount: inModule.length,
      // A drill's timer is chosen by the student and a mock sends no per-module limit: neither is a paper property.
      timeLimitSeconds: null,
    };
  });

  const observedRoute =
    isMock && isModuleType(attempt.m2Type) && (attempt.m2Type === "m2_easy" || attempt.m2Type === "m2_hard")
      ? attempt.m2Type
      : null;
  const withoutAnswer = questions.filter((q) => q.correctAnswer === null).length;
  const withExplanation = questions.filter((q) => q.explanation !== null).length;

  if (!parsed.evidence.resultObserved) warnings.push("Result call not captured: correct answers are only known for individually checked questions");
  if (isMock && !parsed.evidence.module1EndObserved) warnings.push("Module 1 submission (mEndModule1) not captured");
  if (isMock && observedRoute === null) warnings.push("Module 2 route (m2_type) not observed");
  if (withoutAnswer > 0) warnings.push(`${withoutAnswer} question(s) have no correct answer`);
  if (attempt.count !== null && attempt.count !== questions.length) {
    warnings.push(`Source reports ${attempt.count} questions in the attempt; ${questions.length} were captured`);
  }
  if (questions.some((q) => q.moduleType === "unknown")) warnings.push("Some questions could not be assigned to a module");
  if (attempt.examIds.length > 0 && attempt.examNames.length === 0) warnings.push("Exam source name not captured; only its ID is known");

  const sectionLabel = sections.map((s) => SECTION_LABELS[s]).join(" + ") || "unknown section";
  const examLabel = attempt.examNames.join(", ") || (attempt.examIds.length > 0 ? `exam source ${attempt.examIds.join(", ")}` : null);
  const paper: NormalizedPaper = {
    source: sourceName,
    // Bluecorn has no fixed papers: every mock or drill is assembled per attempt, so the attempt is the paper's identity.
    sourcePaperId: attempt.id,
    title: [examLabel, sectionLabel, isMock ? "adaptive mock" : `question set (${questions.length})`].filter(Boolean).join(" — "),
    description: isMock
      ? `Imported from one recorded Bluecorn adaptive mock attempt (${sectionLabel}). ` +
        `Contains Module 1 and only the Module 2 route that attempt was given.`
      : `Imported from one recorded Bluecorn practice drill (${sectionLabel}). ` +
        `A flat question set: the source applies no module or adaptive structure to drills.`,
    status: "draft",
    sections,
    modules,
    adaptive: {
      isAdaptive: observedRoute !== null,
      // In a mock the app sends only the attempt ID when Module 1 is submitted; the route comes back from the server.
      routing: isMock && parsed.evidence.module1EndObserved ? "server_side" : "unknown",
      observedRoute,
      module1Correct: isMock ? attempt.m1Correct : null,
      routingThreshold: null,
    },
    questionCount: questions.length,
    metadata: {
      importKind: attempt.kind,
      expectedQuestionCount: attempt.count,
      questionsWithoutAnswer: withoutAnswer,
      difficultyAvailable: labels.difficulty !== null,
      topicAvailable: labels.topic !== null,
      skillAvailable: labels.skill !== null,
      explanationsAvailable: withExplanation > 0,
    },
    sourceMetadata: {
      attemptId: attempt.id,
      attemptKind: attempt.kind,
      attemptName: attempt.name,
      attemptStatus: attempt.status,
      sourceSection: attempt.section,
      examIds: attempt.examIds,
      examNames: attempt.examNames,
      filter: attempt.filter,
      timed: attempt.timed,
      attemptTimeLimitSeconds: attempt.timeLimitSeconds,
      m2Type: attempt.m2Type,
      m1Correct: attempt.m1Correct,
      m2Correct: attempt.m2Correct,
      evidence: parsed.evidence,
    },
  };

  return { paper, questions, warnings };
}
