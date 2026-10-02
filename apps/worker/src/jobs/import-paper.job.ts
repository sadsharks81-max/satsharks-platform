import { getEnv, requireEnv } from "@satsharks/config";
import { connectMongo } from "@satsharks/db";
import { upsertPaper, type ImportResult } from "../services/import.service";
import { runPipeline, type PipelineResult } from "../services/pipeline.service";

export const IMPORT_PAPER_QUEUE = "paper-import";

export interface ImportPaperJobData {
  harPath: string;
  attemptId?: string;
  dryRun?: boolean;
}

export interface ImportPaperJobResult {
  pipeline: PipelineResult;
  // null when validation failed or this was a dry run: nothing was written to the database.
  database: ImportResult | null;
}

// Used by both the CLI and the queue worker, so there is one import code path.
export async function importPaperJob(data: ImportPaperJobData): Promise<ImportPaperJobResult> {
  const env = getEnv();
  const pipeline = runPipeline({
    harPath: data.harPath,
    attemptId: data.attemptId,
    sourceName: env.SOURCE_NAME,
    apiHost: env.SOURCE_API_HOST,
  });

  if (data.dryRun || pipeline.validation.errors.length > 0) return { pipeline, database: null };

  await connectMongo(requireEnv("MONGODB_URI"));
  return { pipeline, database: await upsertPaper(pipeline.paper, pipeline.questions) };
}
