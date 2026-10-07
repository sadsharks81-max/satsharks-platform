// Models live in @satsharks/db so the worker's importer and the API share one definition.
export { UserModel, PaperModel, QuestionModel, trusted } from "@satsharks/db";
export type { UserDoc, PaperDoc, QuestionDoc } from "@satsharks/db";
