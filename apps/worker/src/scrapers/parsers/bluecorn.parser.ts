import type { AttemptCapture } from "../source/bluecorn/discovery";
import { parseAttempt, type SourceAttempt } from "../source/bluecorn/paper";
import { parseQuestions, type SourceQuestion } from "../source/bluecorn/question";

export interface ParsedAttempt {
  attempt: SourceAttempt;
  questions: SourceQuestion[];
  // Which calls were available. Drives what the normalizer can and cannot know.
  evidence: {
    questionCalls: number;
    module1EndObserved: boolean;
    endObserved: boolean;
    resultObserved: boolean;
  };
}

export function parseAttemptCapture(capture: AttemptCapture): ParsedAttempt {
  return {
    attempt: parseAttempt(capture),
    questions: parseQuestions(capture),
    evidence: {
      questionCalls: capture.questionCalls.length,
      module1EndObserved: capture.endModule1 !== null,
      endObserved: capture.end !== null,
      resultObserved: capture.result !== null,
    },
  };
}
