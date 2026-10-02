// Source -> discovery -> raw -> parser -> normalizer -> validation. Stops before the database,
// so it can be run and inspected without one.
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "@satsharks/config";
import { normalizeBluecornAttempt, type NormalizedImport } from "../scrapers/normalizers/bluecorn.normalizer";
import { parseAttemptCapture } from "../scrapers/parsers/bluecorn.parser";
import { readRpcCalls } from "../scrapers/source/bluecorn/client";
import { captureAttempt, discoverAttempts } from "../scrapers/source/bluecorn/discovery";
import { validateImport, type ValidationReport } from "../scrapers/validators/import.validator";

export interface PipelineOptions {
  harPath: string;
  sourceName: string;
  apiHost: string;
  // Required only when the recording contains more than one attempt.
  attemptId?: string;
  // Defaults to <repo>/data/proof-of-concept.
  outputRoot?: string;
}

export interface PipelineResult extends NormalizedImport {
  attemptId: string;
  outputDir: string;
  validation: ValidationReport;
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function runPipeline(options: PipelineOptions): PipelineResult {
  const calls = readRpcCalls(options.harPath, options.apiHost);
  if (calls.length === 0) {
    throw new Error(`No RPC calls to ${options.apiHost} found in ${options.harPath}`);
  }

  const attempts = discoverAttempts(calls);
  const listing = attempts.map((attempt) => `${attempt.id} (${attempt.kind})`);
  if (attempts.length === 0) {
    const seen = [...new Set(calls.map((call) => call.fn))].join(", ");
    throw new Error(`No mock or drill attempt found in the recording. RPC functions present: ${seen}`);
  }
  // One paper per run, by design.
  if (!options.attemptId && attempts.length > 1) {
    throw new Error(`The recording contains ${attempts.length} attempts. Choose one with --attempt <id>:\n  ${listing.join("\n  ")}`);
  }
  const attempt = options.attemptId ? attempts.find((candidate) => candidate.id === options.attemptId) : attempts[0];
  if (!attempt) {
    throw new Error(`Attempt ${options.attemptId} is not in the recording. Found: ${listing.join(", ")}`);
  }
  const attemptId = attempt.id;

  const capture = captureAttempt(calls, attempt);
  const outputDir = path.join(options.outputRoot ?? path.join(REPO_ROOT, "data", "proof-of-concept"), attemptId);

  // Raw: the source's own request/response bodies, untouched, for debugging the importer.
  writeJson(path.join(outputDir, "raw", "rpc-calls.json"), capture.calls);
  if (capture.metadata) writeJson(path.join(outputDir, "raw", "exam-catalogue.json"), capture.metadata.response);

  const normalized = normalizeBluecornAttempt(parseAttemptCapture(capture), options.sourceName);
  const validation = validateImport(normalized.paper, normalized.questions);

  writeJson(path.join(outputDir, "normalized", "paper.json"), normalized.paper);
  writeJson(path.join(outputDir, "normalized", "questions.json"), normalized.questions);
  writeJson(path.join(outputDir, "metadata.json"), {
    source: options.sourceName,
    method: "har-recording",
    harFile: path.basename(options.harPath),
    attemptId,
    attemptKind: attempt.kind,
    generatedAt: new Date().toISOString(),
    rpcCalls: capture.calls.length,
    questions: normalized.questions.length,
    modules: normalized.paper.modules,
    warnings: normalized.warnings,
    errors: validation.errors,
  });

  return { ...normalized, attemptId, outputDir, validation };
}
