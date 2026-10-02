// Imports exactly one paper from a recorded HAR file.
//
//   npm run scrape:paper -- <path-to.har> [--attempt <id>] [--dry-run]
//
// --dry-run stops after validation: raw and normalized files are written, MongoDB is not touched.
import path from "node:path";
import { disconnectMongo } from "@satsharks/db";
import { MODULE_TYPE_LABELS, SECTION_LABELS } from "@satsharks/types";
import { importPaperJob } from "../jobs/import-paper.job";

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let attemptId: string | undefined;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i]!;
    if (value === "--dry-run") dryRun = true;
    else if (value === "--attempt") attemptId = argv[++i];
    else positional.push(value);
  }
  return { harPath: positional[0], attemptId, dryRun };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.harPath) {
    throw new Error("Usage: npm run scrape:paper -- <path-to.har> [--attempt <id>] [--dry-run]");
  }
  // npm runs scripts from the package directory; resolve against where the user actually was.
  const harPath = path.resolve(process.env.INIT_CWD ?? process.cwd(), args.harPath);

  const { pipeline, database } = await importPaperJob({ harPath, attemptId: args.attemptId, dryRun: args.dryRun });
  const { paper, questions, warnings, validation } = pipeline;
  const withAnswer = questions.filter((question) => question.correctAnswer !== null).length;
  const withDifficulty = questions.filter((question) => question.difficulty !== null).length;
  const adaptiveLine =
    paper.metadata.importKind === "drill"
      ? "Not applicable (drill recording: a flat question set, no modules)"
      : paper.adaptive.observedRoute
        ? `Route observed: ${MODULE_TYPE_LABELS[paper.adaptive.observedRoute]} (Module 1 correct: ${paper.adaptive.module1Correct ?? "unknown"}); rule not directly exposed`
        : "Not directly exposed";

  const lines = [
    `Paper: ${paper.title}`,
    `Source: ${paper.source} (attempt ${paper.sourcePaperId})`,
    "",
    "Sections:",
    ...paper.sections.map((section) => `  ${SECTION_LABELS[section]}`),
    "",
    "Modules:",
    ...paper.modules.map(
      (module) => `  ${SECTION_LABELS[module.section]} - ${MODULE_TYPE_LABELS[module.moduleType]}: ${module.questionCount} questions`,
    ),
    "",
    `Questions discovered: ${questions.length}${paper.metadata.expectedQuestionCount != null ? ` (source reports ${String(paper.metadata.expectedQuestionCount)})` : ""}`,
    `Questions with a correct answer: ${withAnswer}`,
    `Questions imported: ${database ? `${database.questionsInserted} inserted, ${database.questionsUpdated} already present (${database.questionsInDatabase} in database)` : "0"}`,
    "",
    `Difficulty metadata: ${withDifficulty > 0 ? "Available" : "Not available"}`,
    `Adaptive routing metadata: ${adaptiveLine}`,
    "",
    `Status: ${database ? database.status : `${paper.status} (not written to the database)`}`,
    `Files: ${path.relative(process.cwd(), pipeline.outputDir) || pipeline.outputDir}`,
  ];
  console.log(lines.join("\n"));

  if (warnings.length > 0) console.log(`\nWarnings (${warnings.length}):\n${warnings.map((w) => `  - ${w}`).join("\n")}`);
  if (validation.errors.length > 0) {
    console.error(`\nValidation failed (${validation.errors.length}); nothing was written to the database:\n${validation.errors.map((e) => `  - ${e}`).join("\n")}`);
    process.exitCode = 1;
  } else if (args.dryRun) {
    console.log("\nDry run: validation passed, MongoDB was not touched.");
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectMongo());
