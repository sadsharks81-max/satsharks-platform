// Takes one adaptive mock on the source site, the way a student would, and records every
// request and response. Used to learn how the source builds its modules. It does not import
// anything into our database.
//
//   npm run observe:mock -- --answers none   submit Module 1 with no answers
//   npm run observe:mock -- --answers key    answer Module 1 with our answer key
//
// Needs SOURCE_ACCESS_TOKEN (your own session) and MONGODB_URI (for the answer key).
import fs from "node:fs";
import path from "node:path";
import { getEnv, REPO_ROOT, requireEnv } from "@satsharks/config";
import { connectMongo, disconnectMongo, QuestionModel, type QuestionDoc } from "@satsharks/db";
import { isRecord } from "@satsharks/utils";
import { createRpc, tokenExpiry } from "../scrapers/source/bluecorn/api-client";

interface Recorded {
  fn: string;
  request: Record<string, unknown>;
  response: unknown;
}

const argValue = (name: string) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

async function main(): Promise<void> {
  const mode = argValue("answers");
  if (mode !== "none" && mode !== "key") throw new Error("Usage: npm run observe:mock -- --answers none|key");
  const section = argValue("section") === "rw" ? "rw" : "math";

  const env = getEnv();
  const token = requireEnv("SOURCE_ACCESS_TOKEN");
  const minutesLeft = Math.floor(((tokenExpiry(token)?.getTime() ?? 0) - Date.now()) / 60_000);
  if (minutesLeft <= 1) throw new Error("SOURCE_ACCESS_TOKEN has expired. Copy a fresh one.");
  console.log(`Token valid for ${minutesLeft} more minute(s).`);

  const raw = createRpc({ apiHost: env.SOURCE_API_HOST, apiKey: requireEnv("SOURCE_API_KEY"), accessToken: token, delayMs: env.SOURCE_REQUEST_DELAY_MS });
  const calls: Recorded[] = [];
  const rpc = async (fn: string, request: Record<string, unknown>) => {
    const response = await raw(fn, request);
    calls.push({ fn, request, response });
    return response;
  };

  if (mode === "key") await connectMongo(requireEnv("MONGODB_URI"));
  let attemptId = "unknown";
  const save = () => {
    const file = path.join(REPO_ROOT, "data", "mock-observations", `${new Date().toISOString().replace(/[:.]/g, "-")}-${section}-${mode}-${attemptId.slice(0, 8)}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify({ mode, section, attemptId, calls }, null, 2)}\n`);
    console.log(`Saved ${calls.length} calls to ${path.relative(process.cwd(), file)}`);
  };

  try {
    const started = await rpc("mStart", { p_section: section, p_exam_ids: null, p_timer: true, p_t_time: null, p_name: `observe ${mode}` });
    if (typeof started !== "string") throw new Error(`mStart returned ${JSON.stringify(started)}`);
    attemptId = started;
    console.log("Mock started:", attemptId);

    const fetched = new Set<string>();
    const readModule = async (label: string) => {
      const snapshot = await rpc("mGetAttempt", { p_attempt_id: attemptId });
      const navigation = isRecord(snapshot) && Array.isArray(snapshot.navigation) ? snapshot.navigation.filter(isRecord) : [];
      const attempt = isRecord(snapshot) && isRecord(snapshot.attempt) ? snapshot.attempt : {};
      console.log(`${label}: current_module=${String(attempt.current_module)} m2_type=${String(attempt.m2_type)} count=${String(attempt.count)} navigation=${navigation.length}`);
      const questions: Record<string, unknown>[] = [];
      for (const entry of navigation) {
        const id = String(entry.testId ?? entry.seq);
        if (fetched.has(id)) continue;
        const question = await rpc("mGet", { p_attempt_id: attemptId, p_position: entry.seq });
        if (isRecord(question)) questions.push(question);
        fetched.add(id);
      }
      console.log(`  fetched ${questions.length} question(s)`);
      return questions;
    };

    const module1 = await readModule("Module 1");

    if (mode === "key") {
      let answered = 0;
      for (const question of module1) {
        const known = await QuestionModel.findOne({ source: "bluecorn", sourceQuestionId: String(question.content_id) })
          .select("+correctAnswer")
          .lean<QuestionDoc>();
        const key = known?.correctAnswer;
        if (!known || !key) continue;
        // The app sends a choice's text, or the typed value.
        const answer =
          known.questionType === "mcq" ? (known.choices.find((choice) => choice.key === key.choiceKey)?.text ?? null) : (key.acceptedValues[0] ?? null);
        if (answer === null) continue;
        await rpc("mAnswer", { p_attempt_id: attemptId, p_position: question.position, p_answer: answer, p_flagged: null, p_time: null });
        answered++;
      }
      console.log(`  answered ${answered} of ${module1.length} with our answer key`);
    }

    const ended = await rpc("mEndModule1", { p_attempt_id: attemptId });
    console.log("Module 1 submitted:", JSON.stringify(ended).slice(0, 300));

    await readModule("Module 2");
    const finished = await rpc("mEnd", { p_attempt_id: attemptId });
    console.log("Mock submitted:", JSON.stringify(finished).slice(0, 300));
    const result = await rpc("mrGetResult", { p_attempt_id: attemptId });
    const questions = isRecord(result) && Array.isArray(result.questions) ? result.questions.filter(isRecord) : [];
    const byModule: Record<string, number> = {};
    for (const question of questions) byModule[String(question.module_type)] = (byModule[String(question.module_type)] ?? 0) + 1;
    console.log("Result questions by module:", JSON.stringify(byModule));
  } finally {
    save();
    await disconnectMongo();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
