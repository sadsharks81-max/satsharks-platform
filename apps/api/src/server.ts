import { getJwtSecret } from "@satsharks/config";
import { connectMongo, disconnectMongo } from "@satsharks/db";
import { createLogger, toErrorMessage } from "@satsharks/utils";
import { createApp } from "./app";
import { env } from "./config/env";

const logger = createLogger("api");

async function main(): Promise<void> {
  // Fail at startup, not on the first login, if the signing secret is missing or too short.
  getJwtSecret();

  // Open the port first. Connecting to Atlas can take a while, and if the port is not held during
  // that time another dev server can take it. Data routes answer 503 until the database is ready.
  const server = createApp().listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
  });
  server.on("error", (error: NodeJS.ErrnoException) => {
    logger.error(
      error.code === "EADDRINUSE"
        ? `Port ${env.PORT} is already in use by another program. Stop it (or change PORT in .env and API_URL to match) and start the API again.`
        : "API server error",
      { error: toErrorMessage(error) },
    );
    process.exit(1);
  });

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
