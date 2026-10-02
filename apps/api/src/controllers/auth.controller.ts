import type { Request, Response } from "express";
import type { LoginInput, RegisterInput } from "@satsharks/validation";
import { AUTH_COOKIE_NAME } from "../config/env";
import { authService, toPublicUser } from "../services/auth.service";
import { AppError } from "../utils/app-error";
import { sendOk } from "../utils/respond";
import { authCookieOptions, signAuthToken } from "../utils/token";

export async function register(req: Request, res: Response): Promise<void> {
  const user = await authService.register(req.body as RegisterInput);
  res.cookie(AUTH_COOKIE_NAME, signAuthToken(String(user._id)), authCookieOptions());
  sendOk(res, { user: toPublicUser(user) }, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const user = await authService.login(req.body as LoginInput);
  res.cookie(AUTH_COOKIE_NAME, signAuthToken(String(user._id)), authCookieOptions());
  sendOk(res, { user: toPublicUser(user) });
}

export function logout(_req: Request, res: Response): void {
  const { maxAge: _maxAge, ...options } = authCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, options);
  sendOk(res, { loggedOut: true });
}

export function me(req: Request, res: Response): void {
  if (!req.user) throw AppError.unauthorized();
  sendOk(res, { user: toPublicUser(req.user) });
}
