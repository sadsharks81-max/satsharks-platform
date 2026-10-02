// Collects one exam source's question bank straight from the source API, using your own
// session token (SOURCE_ACCESS_TOKEN in .env), and imports it as a Draft paper.
//
//   npm run collect:bank -- --list                          list exam sources and their sizes
//   npm run collect:bank -- --exam 22 --section math        collect + import one bank
//   npm run collect:bank -- --exam 22 --section math --dry-run
//   npm run collect:bank -- --all [--section math|rw]       every bank; already collected ones are skipped
//
// Safe to re-run: responses are cached under data/collections/, and the import is an upsert.
import fs from "node:fs";
import path from "node:path";
import { getEnv, REPO_ROOT, requireEnv } from "@satsharks/config";
import { connectMongo, disconnectMongo } from "@satsharks/db";
import { bankPaperId, normalizeBluecornBank } from "../scrapers/normalizers/bluecorn-bank.normalizer";
import { createRpc, tokenExpiry } from "../scrapers/source/bluecorn/api-client";
import { collectBank, listExamSources } from "../scrapers/source/bluecorn/bank";
import { validateImport } from "../scrapers/validators/import.validator";
import { upsertPaper } from "../services/import.service";

function parseArgs(argv: string[]) {
  const value = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    list: argv.includes("--list"),
    all: argv.includes("--all"),
    dryRun: argv.includes("--dry-run"),
    exam: value("exam"),
    section: value("section"),
    chunk: value("chunk"),
  };
}

const writeJson = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const env = getEnv();

  const accessToken = requireEnv("SOURCE_ACCESS_TOKEN");
  const expiry = tokenExpiry(accessToken);
  if (!expiry) throw new Error("SOURCE_ACCESS_TOKEN is not a session token. Copy the access_token value (it starts with eyJ).");
  const minutesLeft = Math.floor((expiry.getTime() - Date.now()) / 60_000);
  // Not fatal: a bank that is already fully cached on disk can be imported without any request.
  console.log(
    minutesLeft > 0
      ? `Session token valid for ${minutesLeft} more minute(s).`
      : `Session token expired ${-minutesLeft} minute(s) ago: only work already saved on disk can proceed.`,
  );

  let calls = 0;
  const rpc = createRpc({
    apiHost: env.SOURCE_API_HOST,
    apiKey: requireEnv("SOURCE_API_KEY"),
    accessToken,
    delayMs: env.SOURCE_REQUEST_DELAY_MS,
    onCall: () => calls++,
  });

  if (args.list) {
    const exams = await listExamSources(rpc);
    console.log("\n  ID  Math    R&W  Exam source");
    for (const exam of exams) {
      console.log(`${String(exam.id).padStart(4)} ${String(exam.counts?.math ?? "?").padStart(5)} ${String(exam.counts?.rw ?? "?").padStart(6)}  ${exam.name}`);
    }
    return;
  }

  const chunkSize = args.chunk ? Number(args.chunk) : 100;
  if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 200) throw new Error("--chunk must be between 1 and 200");
  const sectionArg = args.section;
  if (sectionArg !== undefined && sectionArg !== "math" && sectionArg !== "rw") throw new Error("--section must be math or rw");

  const runOne = async (examId: number, section: "math" | "rw"): Promise<void> => {
    const dir = path.join(REPO_ROOT, "data", "collections", bankPaperId(examId, section));
    const bank = await collectBank({ rpc, examId, section, dir, chunkSize, log: (message) => console.log(message) });

    const { paper, questions, warnings } = normalizeBluecornBank(bank, env.SOURCE_NAME);
    const validation = validateImport(paper, questions);
    writeJson(path.join(dir, "normalized", "paper.json"), paper);
    writeJson(path.join(dir, "normalized", "questions.json"), questions);
    writeJson(path.join(dir, "metadata.json"), {
      source: env.SOURCE_NAME,
      method: "api",
      generatedAt: new Date().toISOString(),
      questions: questions.length,
      stats: bank.stats,
      warnings,
      errors: validation.errors,
    });

    const labelCounts = paper.metadata.labelCounts as Record<string, number>;
    console.log(
      [
        "",
        `Paper: ${paper.title}`,
        `Questions collected: ${questions.length} of ${bank.expectedCount}`,
        `With a correct answer: ${questions.length - Number(paper.metadata.questionsWithoutAnswer)}`,
        `Difficulty: ${labelCounts.easy} easy, ${labelCounts.hard} hard, ${labelCounts.difficultyNotStated} not stated by the source`,
        `Without topic: ${labelCounts.withoutTopic}   Without skill: ${labelCounts.withoutSkill}`,
        `Requests so far: ${calls} (${bank.stats.cached} responses reused from disk, ${bank.stats.drillsCreated} drill(s) created on your account)`,
        `Files: ${path.relative(process.cwd(), dir)}`,
      ].join("\n"),
    );
    if (warnings.length > 0) console.log(`\nWarnings (${warnings.length}):\n${warnings.slice(0, 20).map((w) => `  - ${w}`).join("\n")}`);

    if (validation.errors.length > 0) {
      console.error(`\nValidation failed (${validation.errors.length}); nothing was written to the database:\n${validation.errors.slice(0, 20).map((e) => `  - ${e}`).join("\n")}`);
      process.exitCode = 1;
      return;
    }
    if (args.dryRun) {
      console.log("\nDry run: validation passed, MongoDB was not touched.");
      return;
    }

    await connectMongo(requireEnv("MONGODB_URI"));
    const result = await upsertPaper(paper, questions);
    console.log(`\nImported as ${result.status}: ${result.questionsInserted} inserted, ${result.questionsUpdated} already present (${result.questionsInDatabase} in database).`);
  };

  if (args.all) {
    // Every exam source that has questions in the requested section(s). Banks already on disk cost no requests.
    const exams = await listExamSources(rpc);
    const jobs = exams.flatMap((exam) =>
      (sectionArg ? ([sectionArg] as const) : (["math", "rw"] as const))
        .filter((section) => (exam.counts?.[section] ?? 0) > 0)
        .map((section) => ({ exam, section })),
    );
    console.log(`${jobs.length} bank(s) to collect.`);
    for (const [index, job] of jobs.entries()) {
      console.log(`
===== ${index + 1}/${jobs.length} =====`);
      await runOne(job.exam.id, job.section);
    }
    return;
  }

  const examId = Number(args.exam);
  if (!Number.isInteger(examId) || !sectionArg) {
    throw new Error("Usage: npm run collect:bank -- --exam <id> --section math|rw [--chunk 100] [--dry-run]   (or --list, or --all [--section math|rw])");
  }
  await runOne(examId, sectionArg);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => disconnectMongo());
