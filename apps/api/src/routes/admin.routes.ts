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
  getUser,
  listQuestions,
  listReports,
  listUsers,
  reopenReport,
  resolveReport,
  setAdaptiveSettings,
  setConversionTables,
  updateUser,
  setPapersStatus,
  setPaperStatus,
  updateQuestion,
  uploadImage,
} from "../controllers/admin.controller";
import {
  createTestUpload,
  deleteTestUpload,
  getTestUpload,
  listTestUploads,
  publishTestUpload,
  replaceTestUploadSection,
  saveTestUploadSection,
  setTestUploadActive,
  updateTestUpload,
} from "../controllers/test-upload.controller";
import { requireAuth, requirePermission } from "../middleware/auth";
import { imageUpload, testPdfUpload } from "../middleware/upload";
import { requireDb } from "../middleware/require-db";
import { validateBody } from "../middleware/validate";

export const adminRouter = Router();

adminRouter.use(requireDb, requireAuth, requirePermission("admin:access"));

adminRouter.get("/stats", getStats);

adminRouter.get("/settings/adaptive", getAdaptiveSettings);
adminRouter.put("/settings/adaptive", requirePermission("papers:write"), setAdaptiveSettings);
adminRouter.get("/settings/scoring", getConversionTables);
adminRouter.put("/settings/scoring", requirePermission("papers:write"), setConversionTables);

adminRouter.get("/users", requirePermission("users:read"), listUsers);
adminRouter.get("/users/:id", requirePermission("users:read"), getUser);
adminRouter.patch("/users/:id", requirePermission("users:write"), updateUser);

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
adminRouter.post("/assets", requirePermission("questions:write"), imageUpload.single("image"), uploadImage);

// Uploaded practice tests (two PDFs → review → publish → activate).
adminRouter.get("/test-uploads", requirePermission("papers:read"), listTestUploads);
adminRouter.post(
  "/test-uploads",
  requirePermission("papers:write"),
  testPdfUpload.fields([
    { name: "readingWriting", maxCount: 1 },
    { name: "math", maxCount: 1 },
  ]),
  createTestUpload,
);
adminRouter.get("/test-uploads/:id", requirePermission("papers:read"), getTestUpload);
adminRouter.patch("/test-uploads/:id", requirePermission("papers:write"), updateTestUpload);
adminRouter.post("/test-uploads/:id/sections/:section/file", requirePermission("papers:write"), testPdfUpload.single("file"), replaceTestUploadSection);
adminRouter.put("/test-uploads/:id/sections/:section", requirePermission("papers:write"), saveTestUploadSection);
adminRouter.post("/test-uploads/:id/publish", requirePermission("papers:write"), publishTestUpload);
adminRouter.post("/test-uploads/:id/active", requirePermission("papers:write"), setTestUploadActive);
adminRouter.delete("/test-uploads/:id", requirePermission("papers:write"), deleteTestUpload);
