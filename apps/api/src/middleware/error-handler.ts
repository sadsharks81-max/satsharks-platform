import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { createLogger } from "@satsharks/utils";
import { AppError } from "../utils/app-error";

const logger = createLogger("api");

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`No route for ${req.method} ${req.path}`));
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError) {
    return AppError.badRequest(
      "Invalid request",
      error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }
  if (typeof error === "object" && error !== null) {
    const candidate = error as { code?: unknown; type?: unknown; name?: unknown };
    if (candidate.code === 11000) return AppError.conflict("That record already exists");
    if (candidate.type === "entity.parse.failed") return AppError.badRequest("Request body is not valid JSON");
    if (candidate.type === "entity.too.large") return new AppError(413, "payload_too_large", "Request body is too large");
    if (candidate.name === "CastError") return AppError.badRequest("Invalid identifier");
    if (candidate.name === "MulterError") {
      return candidate.code === "LIMIT_FILE_SIZE" ? new AppError(413, "payload_too_large", "That file is too large") : AppError.badRequest("Unexpected file in the upload");
    }
  }
  return new AppError(500, "internal_error", "Something went wrong");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express identifies error handlers by arity.
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  const appError = toAppError(error);
  if (appError.status >= 500) {
    logger.error("Unhandled error", { method: req.method, path: req.path, error });
  }
  res.status(appError.status).json({
    ok: false,
    error: { code: appError.code, message: appError.message, details: appError.details },
  });
}
