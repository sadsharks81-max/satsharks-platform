import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env, isProduction } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { apiRateLimit } from "./middleware/rate-limit";
import { apiRouter } from "./routes";

export function createApp(): Express {
  const app = express();

  // Behind Railway's / Vercel's proxy: needed for correct client IPs (rate limiting) and secure cookies.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  // A reviewed section of an uploaded test (up to ~80 questions with passages) is one request.
  // Parsed here first; the general parser below then leaves the body alone.
  app.use("/api/admin/test-uploads", express.json({ limit: "2mb" }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  // morgan logs method, path, status and timing only: no bodies, cookies or headers.
  app.use(morgan(isProduction ? "combined" : "dev"));

  app.use("/api", apiRateLimit, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
