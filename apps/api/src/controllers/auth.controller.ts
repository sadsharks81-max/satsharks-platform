import type { Request, Response } from "express";
import { isMongoConnected } from "@satsharks/db";
import { createLogger, toErrorMessage } from "@satsharks/utils";
import type { ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput } from "@satsharks/validation";
import { AUTH_COOKIE_NAME } from "../config/env";
import { authService, toPublicUser } from "../services/auth.service";
import { AppError } from "../utils/app-error";
import { sendOk } from "../utils/respond";
import { authCookieOptions, signAuthToken, verifyAuthToken } from "../utils/token";

const logger = createLogger("auth");

export async function register(req: Request, res: Response): Promise<void> {
  const user = await authService.register(req.body as RegisterInput);
  res.cookie(AUTH_COOKIE_NAME, signAuthToken(String(user._id), await authService.startSession(user)), authCookieOptions(req));
  sendOk(res, { user: toPublicUser(user) }, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const user = await authService.login(req.body as LoginInput);
  res.cookie(AUTH_COOKIE_NAME, signAuthToken(String(user._id), await authService.startSession(user)), authCookieOptions(req));
  sendOk(res, { user: toPublicUser(user) });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];
  const payload = typeof token === "string" ? verifyAuthToken(token) : null;
  if (payload?.sid && isMongoConnected()) {
    // Logging out must work even if the database is unreachable; the cookie is cleared regardless.
    await authService.endSession(payload.sub, payload.sid).catch((error) => logger.error("Ending a session failed", { error: toErrorMessage(error) }));
  }
  const { maxAge: _maxAge, ...options } = authCookieOptions(req);
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
  const { maxAge: _maxAge, ...options } = authCookieOptions(req);
  res.clearCookie(AUTH_COOKIE_NAME, options);
  sendOk(res, { reset: true });
}
