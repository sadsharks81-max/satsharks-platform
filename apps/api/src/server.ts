import { getJwtSecret } from "@satsharks/config";
import { connectMongo, disconnectMongo } from "@satsharks/db";
import { createLogger, toErrorMessage } from "@satsharks/utils";
import { createApp } from "./app";
import { env } from "./config/env";

const logger = createLogger("api");

async function main(): Promise<void> {
  // Fail at startup, not on the first login, if the signing secret is missing or too short.
  getJwtSecret();

  if (env.MONGODB_URI) {
    try {
      await connectMongo(env.MONGODB_URI);
      logger.info("MongoDB connected");
    } catch (error) {
      // Keep serving /api/health so the problem is visible; data routes answer 503.
      logger.error("MongoDB connection failed", { error: toErrorMessage(error) });
    }
  } else {
    logger.warn("MONGODB_URI is not set: data routes will answer 503 until it is configured");
  }

  const server = createApp().listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      void disconnectMongo().finally(() => process.exit(0));
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error("API failed to start", { error: toErrorMessage(error) });
  process.exit(1);
});
