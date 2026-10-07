/**
 * Tag on every question published from a full-test upload. Full-test questions
 * belong to their exam, so the practice question list and generated custom
 * practice tests exclude anything carrying it.
 */
export const FULL_TEST_QUESTION_TAG = "full-test";

/** Per-test tag, so a test's questions can be found without walking its modules. */
export const fullTestQuestionTag = (testId: string) => `${FULL_TEST_QUESTION_TAG}:${testId}`;
