import {
  normalizedPaperSchema,
  normalizedQuestionSchema,
  type NormalizedPaper,
  type NormalizedQuestion,
} from "@satsharks/validation";

export interface ValidationReport {
  // Errors block the import. Warnings (reported by the normalizer) do not.
  errors: string[];
}

const describe = (question: NormalizedQuestion) =>
  `${question.moduleType} #${question.questionNumber} (${question.sourceQuestionId})`;

export function validateImport(paper: NormalizedPaper, questions: NormalizedQuestion[]): ValidationReport {
  const errors: string[] = [];

  const paperResult = normalizedPaperSchema.safeParse(paper);
  if (!paperResult.success) {
    for (const issue of paperResult.error.issues) errors.push(`paper.${issue.path.join(".")}: ${issue.message}`);
  }
  if (questions.length === 0) errors.push("No questions were found for this paper");

  const identities = new Set<string>();
  const numbers = new Set<string>();
  for (const question of questions) {
    const result = normalizedQuestionSchema.safeParse(question);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${describe(question)}: ${issue.path.join(".")}: ${issue.message}`);
      }
    }

    const identity = `${question.moduleType}|${question.sourceQuestionId}`;
    if (identities.has(identity)) errors.push(`${describe(question)}: duplicate source question in the same module`);
    identities.add(identity);

    const number = `${question.section}|${question.moduleType}|${question.questionNumber}`;
    if (numbers.has(number)) errors.push(`${describe(question)}: duplicate question number in the same module`);
    numbers.add(number);

    if (question.questionType === "mcq") {
      if (question.choices.length < 2) errors.push(`${describe(question)}: multiple-choice question with fewer than 2 choices`);
      const key = question.correctAnswer?.choiceKey;
      if (key && !question.choices.some((choice) => choice.key === key)) {
        errors.push(`${describe(question)}: correct answer "${key}" is not one of the choices`);
      }
    }
    if (question.questionType === "spr" && question.correctAnswer && question.correctAnswer.acceptedValues.length === 0) {
      errors.push(`${describe(question)}: student-produced response with an empty answer list`);
    }
  }

  return { errors };
}
