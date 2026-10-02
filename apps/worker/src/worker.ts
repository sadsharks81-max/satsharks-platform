// Background worker process. Phase 1 registers one queue (paper import); PDF processing,
// AI extraction, image processing and analytics jobs are added here in later phases.
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { getEnv } from "@satsharks/config";
import { createLogger, toErrorMessage } from "@satsharks/utils";
import { IMPORT_PAPER_QUEUE, importPaperJob, type ImportPaperJobData } from "./jobs/import-paper.job";

const logger = createLogger("worker");

function main(): void {
  const { REDIS_URL } = getEnv();
  if (!REDIS_URL) {
    logger.warn("REDIS_URL is not set: no queues to listen on. Run imports with `npm run scrape:paper`.");
    return;
  }

  // BullMQ requires maxRetriesPerRequest to be null on worker connections.
  const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  const worker = new Worker<ImportPaperJobData>(
    IMPORT_PAPER_QUEUE,
    async (job) => {
      const { pipeline, database } = await importPaperJob(job.data);
      return { attemptId: pipeline.attemptId, errors: pipeline.validation.errors, database };
    },
    { connection, concurrency: 1 },
  );

  worker.on("ready", () => logger.info(`Listening on queue "${IMPORT_PAPER_QUEUE}"`));
  worker.on("completed", (job) => logger.info("Job completed", { id: job.id, name: job.name }));
  worker.on("failed", (job, error) => logger.error("Job failed", { id: job?.id, error: toErrorMessage(error) }));

  const shutdown = () => {
    void worker.close().finally(() => connection.quit().finally(() => process.exit(0)));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
