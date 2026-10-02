import type { NextFunction, Request, Response } from "express";
import { roleHasPermission, type Permission } from "@satsharks/types";
import { AUTH_COOKIE_NAME } from "../config/env";
import type { UserDoc } from "../models";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../utils/app-error";
import { verifyAuthToken } from "../utils/token";

declare module "express-serve-static-core" {
  interface Request {
    user?: UserDoc;
  }
}

// The token only carries the user ID. Role and status are read from the database on every request,
// so blocking a user or changing their role takes effect immediately.
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];
  const payload = typeof token === "string" ? verifyAuthToken(token) : null;
  if (!payload) throw AppError.unauthorized();

  const user = await userRepository.findById(payload.sub);
  if (!user || user.status !== "active") throw AppError.unauthorized();

  req.user = user;
  next();
}

// Use after requireAuth.
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw AppError.unauthorized();
    if (!roleHasPermission(req.user.role, permission)) throw AppError.forbidden();
    next();
  };
}
