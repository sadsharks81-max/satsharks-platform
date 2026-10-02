import type { NextFunction, Request, Response } from "express";
import { isMongoConnected } from "@satsharks/db";
import { AppError } from "../utils/app-error";

export function requireDb(_req: Request, _res: Response, next: NextFunction): void {
  if (!isMongoConnected()) throw AppError.unavailable("Database is not connected");
  next();
}
