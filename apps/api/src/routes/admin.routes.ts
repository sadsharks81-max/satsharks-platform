import { Router } from "express";
import { updateQuestionSchema } from "@satsharks/validation";
import { getPaper, listPapers } from "../controllers/admin-paper.controller";
import {
  deleteQuestion,
  getAdaptiveSettings,
  getConversionTables,
  getFacets,
  getQuestion,
  getReport,
  getStats,
  listQuestions,
  listReports,
  reopenReport,
  resolveReport,
  setAdaptiveSettings,
  setConversionTables,
  setPapersStatus,
  setPaperStatus,
  updateQuestion,
} from "../controllers/admin.controller";
import { requireAuth, requirePermission } from "../middleware/auth";
import { requireDb } from "../middleware/require-db";
import { validateBody } from "../middleware/validate";

export const adminRouter = Router();

adminRouter.use(requireDb, requireAuth, requirePermission("admin:access"));

adminRouter.get("/stats", getStats);

adminRouter.get("/settings/adaptive", getAdaptiveSettings);
adminRouter.put("/settings/adaptive", requirePermission("papers:write"), setAdaptiveSettings);
adminRouter.get("/settings/scoring", getConversionTables);
adminRouter.put("/settings/scoring", requirePermission("papers:write"), setConversionTables);

adminRouter.get("/reports", requirePermission("reports:read"), listReports);
adminRouter.get("/reports/:id", requirePermission("reports:read"), getReport);
adminRouter.post("/reports/:id/resolve", requirePermission("reports:write"), resolveReport);
adminRouter.post("/reports/:id/reopen", requirePermission("reports:write"), reopenReport);

adminRouter.get("/papers", requirePermission("papers:read"), listPapers);
adminRouter.post("/papers/status", requirePermission("papers:write"), setPapersStatus);
adminRouter.get("/papers/:id", requirePermission("papers:read"), getPaper);
adminRouter.patch("/papers/:id/status", requirePermission("papers:write"), setPaperStatus);

adminRouter.get("/questions", requirePermission("questions:read"), listQuestions);
adminRouter.get("/questions/facets", requirePermission("questions:read"), getFacets);
adminRouter.get("/questions/:id", requirePermission("questions:read"), getQuestion);
adminRouter.patch("/questions/:id", requirePermission("questions:write"), validateBody(updateQuestionSchema), updateQuestion);
adminRouter.delete("/questions/:id", requirePermission("questions:write"), deleteQuestion);
