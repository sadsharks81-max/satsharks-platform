import rateLimit from "express-rate-limit";

const limited = (message: string) => ({ ok: false, error: { code: "rate_limited", message } });

// Brute-force protection for login/register. In-memory store: fine for a single API instance;
// switch to a Redis store when the API runs on more than one.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: limited("Too many attempts. Try again in a few minutes."),
});

// Each request can send an email, so far fewer are allowed than for login.
export const passwordResetRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: limited("Too many reset requests. Try again in a few minutes."),
});

// Reports are written by students; this stops a script from flooding the admin queue.
export const reportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: limited("Too many reports. Try again later."),
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: limited("Too many requests."),
});
