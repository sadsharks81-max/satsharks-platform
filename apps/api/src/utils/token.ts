import type { CookieOptions, Request } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "@satsharks/config";
import { AUTH_TOKEN_TTL_SECONDS, isProduction } from "../config/env";

export interface AuthTokenPayload {
  sub: string;
  // Seconds since the epoch when the token was signed (set by jsonwebtoken).
  iat: number;
  // The login this token belongs to (students only; see UserDoc.sessionId).
  sid: string | null;
}

export function signAuthToken(userId: string, sessionId: string | null = null): string {
  const payload = sessionId ? { sub: userId, sid: sessionId } : { sub: userId };
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: AUTH_TOKEN_TTL_SECONDS,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (typeof decoded === "string" || typeof decoded.sub !== "string" || typeof decoded.iat !== "number") return null;
    return { sub: decoded.sub, iat: decoded.iat, sid: typeof decoded.sid === "string" ? decoded.sid : null };
  } catch {
    return null;
  }
}

// The web app proxies /api/* through its own origin, so the cookie is first-party and "lax" is enough.
// Secure whenever the request came over HTTPS (Railway's proxy says so), even if NODE_ENV is unset.
export function authCookieOptions(req: Request): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction || req.secure,
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_TOKEN_TTL_SECONDS * 1000,
  };
}
