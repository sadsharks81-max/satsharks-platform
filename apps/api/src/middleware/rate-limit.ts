import type { Request } from "express";
import rateLimit, { type Options } from "express-rate-limit";
import { clientIp } from "../utils/client-ip";

// In-memory stores: fine for a single API instance; switch to a Redis store when the API runs on
// more than one. Every limit counts by the visitor's real address (see clientIp), not Vercel's.

const MINUTE = 60 * 1000;

function limiter(windowMs: number, limit: number, message: string, options: Partial<Options> = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: clientIp,
    message: { ok: false, error: { code: "rate_limited", message } },
    ...options,
  });
}

// Limits for signed-in actions count per account, so students behind one school or home address
// do not share them. Use after requireAuth.
const byAccount = (req: Request) => (req.user ? `user:${String(req.user._id)}` : clientIp(req));

// Register, password reset and invite codes: brute-force protection per address.
export const authRateLimit = limiter(15 * MINUTE, 20, "Too many attempts. Try again in a few minutes.");

// Logins per address. Only failures count, so a school's students signing in together are not blocked.
export const loginRateLimit = limiter(15 * MINUTE, 20, "Too many failed sign-in attempts. Try again in a few minutes.", {
  skipSuccessfulRequests: true,
});

// Failed logins per account, from any address: stops password guessing spread over many addresses.
// Use after validateBody(loginSchema).
export const loginAccountRateLimit = limiter(
  15 * MINUTE,
  10,
  "Too many failed sign-in attempts for this account. Try again in 15 minutes, or reset your password.",
  {
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `login:${String((req.body as { email?: unknown })?.email ?? "").toLowerCase()}`,
  },
);

// Each request can send an email, so far fewer are allowed than for login.
export const passwordResetRateLimit = limiter(15 * MINUTE, 5, "Too many reset requests. Try again in a few minutes.");

// Reports are written by students; this stops a script from flooding the admin queue.
export const reportRateLimit = limiter(60 * MINUTE, 30, "Too many reports. Try again later.");

// Payments a student sends (transfers, card checkouts): enough for mistakes, not for a script.
export const paymentRateLimit = limiter(60 * MINUTE, 20, "Too many payment attempts. Try again later.");

// Starting tests, mocks and drills writes a new attempt each time: far more than a student can
// take, far fewer than a script could create.
export const practiceStartRateLimit = limiter(10 * MINUTE, 60, "Too many new tests started. Wait a few minutes and try again.", {
  keyGenerator: byAccount,
});

// Guessing friend codes would add strangers to a leaderboard.
export const friendRateLimit = limiter(60 * MINUTE, 30, "Too many friend requests. Try again later.", { keyGenerator: byAccount });

export const apiRateLimit = limiter(MINUTE, 300, "Too many requests.");
