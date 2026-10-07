import { Router } from "express";
import { createAttemptSchema, createFullTestSchema, createMockSchema, createReportSchema, saveAnswerSchema } from "@satsharks/validation";
import {
  checkQuestion,
  continueFullTest,
  createAttempt,
  createFullTest,
  createMock,
  deleteAttempt,
  deleteFullTest,
  endAttempt,
  getAttempt,
  getCatalog,
  getFullTest,
  getQuestion,
  getResult,
  listAttempts,
  listFullTests,
  listPracticeTests,
  reportQuestion,
  saveAnswer,
  submitModule,
} from "../controllers/practice.controller";
import { requireAuth } from "../middleware/auth";
import { reportRateLimit } from "../middleware/rate-limit";
import { requireDb } from "../middleware/require-db";
import { validateBody } from "../middleware/validate";

export const practiceRouter = Router();

practiceRouter.use(requireDb, requireAuth);

practiceRouter.get("/catalog", getCatalog);
practiceRouter.get("/attempts", listAttempts);
practiceRouter.post("/attempts", validateBody(createAttemptSchema), createAttempt);
practiceRouter.post("/mocks", validateBody(createMockSchema), createMock);
practiceRouter.get("/tests", listPracticeTests);
practiceRouter.get("/full-tests", listFullTests);
practiceRouter.post("/full-tests", validateBody(createFullTestSchema), createFullTest);
practiceRouter.get("/full-tests/:id", getFullTest);
practiceRouter.post("/full-tests/:id/continue", continueFullTest);
practiceRouter.delete("/full-tests/:id", deleteFullTest);
practiceRouter.get("/attempts/:id", getAttempt);
practiceRouter.delete("/attempts/:id", deleteAttempt);
practiceRouter.post("/attempts/:id/submit-module", submitModule);
practiceRouter.post("/attempts/:id/end", endAttempt);
practiceRouter.get("/attempts/:id/result", getResult);
practiceRouter.get("/attempts/:id/questions/:position", getQuestion);
practiceRouter.patch("/attempts/:id/questions/:position", validateBody(saveAnswerSchema), saveAnswer);
practiceRouter.post("/attempts/:id/questions/:position/check", checkQuestion);
practiceRouter.post("/attempts/:id/questions/:position/report", reportRateLimit, validateBody(createReportSchema), reportQuestion);
