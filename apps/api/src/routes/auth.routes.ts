import { Router } from "express";
import { loginSchema, registerSchema } from "@satsharks/validation";
import { login, logout, me, register } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { authRateLimit } from "../middleware/rate-limit";
import { requireDb } from "../middleware/require-db";
import { validateBody } from "../middleware/validate";

export const authRouter = Router();

authRouter.post("/register", authRateLimit, requireDb, validateBody(registerSchema), register);
authRouter.post("/login", authRateLimit, requireDb, validateBody(loginSchema), login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireDb, requireAuth, me);
