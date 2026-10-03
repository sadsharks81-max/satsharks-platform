import { Router } from "express";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, resetTokenCheckSchema } from "@satsharks/validation";
import { checkResetToken, forgotPassword, login, logout, me, register, resetPassword } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { authRateLimit, passwordResetRateLimit } from "../middleware/rate-limit";
import { requireDb } from "../middleware/require-db";
import { validateBody } from "../middleware/validate";

export const authRouter = Router();

authRouter.post("/register", authRateLimit, requireDb, validateBody(registerSchema), register);
authRouter.post("/login", authRateLimit, requireDb, validateBody(loginSchema), login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireDb, requireAuth, me);

authRouter.post("/forgot-password", passwordResetRateLimit, requireDb, validateBody(forgotPasswordSchema), forgotPassword);
authRouter.post("/reset-password/check", authRateLimit, requireDb, validateBody(resetTokenCheckSchema), checkResetToken);
authRouter.post("/reset-password", authRateLimit, requireDb, validateBody(resetPasswordSchema), resetPassword);
