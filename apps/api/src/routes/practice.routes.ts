import { Router } from "express";
import { createAttemptSchema, createMockSchema, saveAnswerSchema } from "@satsharks/validation";
import {
  checkQuestion,
  createAttempt,
  createMock,
  endAttempt,
  getAttempt,
  getCatalog,
  getQuestion,
  getResult,
  listAttempts,
  saveAnswer,
  submitModule,
} from "../controllers/practice.controller";
import { requireAuth } from "../middleware/auth";
import { requireDb } from "../middleware/require-db";
import { validateBody } from "../middleware/validate";

export const practiceRouter = Router();

practiceRouter.use(requireDb, requireAuth);

practiceRouter.get("/catalog", getCatalog);
practiceRouter.get("/attempts", listAttempts);
practiceRouter.post("/attempts", validateBody(createAttemptSchema), createAttempt);
practiceRouter.post("/mocks", validateBody(createMockSchema), createMock);
practiceRouter.get("/attempts/:id", getAttempt);
practiceRouter.post("/attempts/:id/submit-module", submitModule);
practiceRouter.post("/attempts/:id/end", endAttempt);
practiceRouter.get("/attempts/:id/result", getResult);
practiceRouter.get("/attempts/:id/questions/:position", getQuestion);
practiceRouter.patch("/attempts/:id/questions/:position", validateBody(saveAnswerSchema), saveAnswer);
practiceRouter.post("/attempts/:id/questions/:position/check", checkQuestion);
