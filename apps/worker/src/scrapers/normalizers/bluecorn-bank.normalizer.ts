// Converts a collected exam-source question bank into a SAT Sharks paper + questions.
import { DIFFICULTIES, SECTION_LABELS, type Difficulty } from "@satsharks/types";
import type { NormalizedPaper, NormalizedQuestion } from "@satsharks/validation";
import type { CollectedBank } from "../source/bluecorn/bank";
import { parseQuestion } from "../source/bluecorn/question";
import { buildQuestion, toSection, type NormalizedImport } from "./bluecorn.normalizer";

export function bankPaperId(examId: number, section: string): string {
  return `exam-${examId}-${section}`;
}

export function normalizeBluecornBank(bank: CollectedBank, sourceName: string): NormalizedImport {
  const warnings = [...bank.warnings];
  const section = toSection(bank.section);
  const sourcePaperId = bankPaperId(bank.exam.id, bank.section);

  // The bank has no order of its own; numbering by source ID keeps it stable between runs.
  const ids = [...bank.questions.keys()].sort((a, b) => a - b);
  const questions: NormalizedQuestion[] = ids.map((id, index) => {
    const labels = bank.labels.get(id) ?? { domain: null, skill: null, difficulty: null };
    const difficulty = (DIFFICULTIES as readonly string[]).includes(labels.difficulty ?? "")
      ? (labels.difficulty as Difficulty)
      : null;
    return buildQuestion(parseQuestion(bank.questions.get(id)!), {
      sourceName,
      fallbackSection: section,
      moduleType: "none",
      questionNumber: index + 1,
      labels: { difficulty, topic: labels.domain, skill: labels.skill },
      warnings,
      sourceMetadata: { examId: bank.exam.id, examName: bank.exam.name, collectedBy: "api" },
    });
  });

  const count = (predicate: (question: NormalizedQuestion) => boolean) => questions.filter(predicate).length;
  const withoutAnswer = count((q) => q.correctAnswer === null);
  const unlabelled = {
    topic: count((q) => q.topic === null),
    skill: count((q) => q.skill === null),
    // The source only has "easy" and "hard" filters. A question in neither stays null:
    // it may be medium, but the source never says so.
    difficulty: count((q) => q.difficulty === null),
  };
  if (withoutAnswer > 0) warnings.push(`${withoutAnswer} question(s) have no correct answer`);
  if (unlabelled.topic > 0) warnings.push(`${unlabelled.topic} question(s) have no topic`);
  if (unlabelled.skill > 0) warnings.push(`${unlabelled.skill} question(s) have no skill`);

  const sectionLabel = section ? SECTION_LABELS[section] : bank.section;
  const paper: NormalizedPaper = {
    source: sourceName,
    sourcePaperId,
    title: `${bank.exam.name} — ${sectionLabel} — question bank (${questions.length})`,
    description: `Every ${sectionLabel} question the source lists for ${bank.exam.name}. A question bank, not a timed paper: no modules and no fixed order.`,
    status: "draft",
    sections: section ? [section] : [],
    modules: section
      ? [{ key: `${section}-none`, section, moduleNumber: null, moduleType: "none", questionCount: questions.length, timeLimitSeconds: null }]
      : [],
    adaptive: { isAdaptive: false, routing: "unknown", observedRoute: null, module1Correct: null, routingThreshold: null },
    questionCount: questions.length,
    metadata: {
      importKind: "bank",
      expectedQuestionCount: bank.expectedCount,
      questionsWithoutAnswer: withoutAnswer,
      difficultyAvailable: unlabelled.difficulty < questions.length,
      topicAvailable: unlabelled.topic < questions.length,
      skillAvailable: unlabelled.skill < questions.length,
      explanationsAvailable: count((q) => q.explanation !== null) > 0,
      labelCounts: {
        easy: count((q) => q.difficulty === "easy"),
        hard: count((q) => q.difficulty === "hard"),
        difficultyNotStated: unlabelled.difficulty,
        withoutTopic: unlabelled.topic,
        withoutSkill: unlabelled.skill,
      },
    },
    sourceMetadata: {
      examId: bank.exam.id,
      examName: bank.exam.name,
      examDate: bank.exam.examDate,
      sourceSection: bank.section,
      catalogueCounts: bank.exam.counts,
    },
  };

  return { paper, questions, warnings };
}
