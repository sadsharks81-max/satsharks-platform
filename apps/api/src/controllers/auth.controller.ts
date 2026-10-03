import type { Request, Response } from "express";
import { createLogger, toErrorMessage } from "@satsharks/utils";
import type { ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput } from "@satsharks/validation";
import { AUTH_COOKIE_NAME } from "../config/env";
import { authService, toPublicUser } from "../services/auth.service";
import { AppError } from "../utils/app-error";
import { sendOk } from "../utils/respond";
import { authCookieOptions, signAuthToken } from "../utils/token";

const logger = createLogger("auth");

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

// Answers at once with the same message for every address. The lookup and the email happen after
// the response, so its timing does not reveal whether the account exists.
export function forgotPassword(req: Request, res: Response): void {
  const { email } = req.body as ForgotPasswordInput;
  void authService.requestPasswordReset(email).catch((error) => logger.error("Password reset request failed", { error: toErrorMessage(error) }));
  sendOk(res, { sent: true });
}

export async function checkResetToken(req: Request, res: Response): Promise<void> {
  sendOk(res, { valid: await authService.isResetTokenValid((req.body as { token: string }).token) });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await authService.resetPassword(req.body as ResetPasswordInput);
  // Any session cookie in this browser belongs to the old password; the student signs in again.
  const { maxAge: _maxAge, ...options } = authCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, options);
  sendOk(res, { reset: true });
}
