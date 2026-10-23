import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env, isProduction } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { apiRateLimit } from "./middleware/rate-limit";
import { apiRouter } from "./routes";
import { clientIp } from "./utils/client-ip";

// Uploaded-test sections are parsed with a larger limit by the admin router, after the sign-in check.
export const LARGE_BODY_PATH = "/api/admin/test-uploads";

export function createApp(): Express {
  const app = express();

  // Behind Railway's / Vercel's proxy: needed for correct client IPs (rate limiting) and secure cookies.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  // Before any body is read, so a flood is refused cheaply.
  app.use("/api", apiRateLimit);
  const json = express.json({ limit: "100kb" });
  app.use((req, res, next) => (req.path.startsWith(LARGE_BODY_PATH) ? next() : json(req, res, next)));
  app.use(cookieParser());
  // morgan logs method, path, status and timing only: no bodies, cookies or headers. The address is
  // the visitor's, not the Vercel proxy's.
  morgan.token("client-ip", (req) => clientIp(req as express.Request));
  app.use(
    morgan(isProduction ? ':client-ip - [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"' : "dev"),
  );

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
