import type { CookieOptions } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "@satsharks/config";
import { AUTH_TOKEN_TTL_SECONDS, isProduction } from "../config/env";

export interface AuthTokenPayload {
  sub: string;
}

export function signAuthToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies AuthTokenPayload, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: AUTH_TOKEN_TTL_SECONDS,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (typeof decoded === "string" || typeof decoded.sub !== "string") return null;
    return { sub: decoded.sub };
  } catch {
    return null;
  }
}

// The web app proxies /api/* through its own origin, so the cookie is first-party and "lax" is enough.
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_TOKEN_TTL_SECONDS * 1000,
  };
}
