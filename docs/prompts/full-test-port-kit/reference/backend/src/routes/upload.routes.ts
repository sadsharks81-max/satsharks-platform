import { Router } from "express";
import { uploadPracticeTest, uploadPracticeQuestions, getUploads, getUpload, triggerExtraction, reviewUpload, publishUpload, deleteUpload, uploadImage } from "../controllers/upload.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/role.middleware";
import {
  createFullTestUpload,
  deleteFullTestUpload,
  getFullTestUpload,
  listFullTestUploads,
  publishFullTestUpload,
  replaceFullTestSection,
  saveFullTestSectionReview,
} from "../controllers/full-test-upload.controller";
import {
  fullTestPdfUpload,
  memoryImageUpload as imageUpload,
  practiceTestUpload as upload,
} from "../middleware/upload.middleware";

const router = Router();

// Full adaptive tests (English + Math PDFs). Registered before "/:id" so the
// literal "full-tests" segment is never read as an upload id.
router.get("/full-tests", authenticate, requireAdmin(), listFullTestUploads);
router.post(
  "/full-tests",
  authenticate,
  requireAdmin(),
  fullTestPdfUpload.fields([
    { name: "readingWriting", maxCount: 1 },
    { name: "math", maxCount: 1 },
  ]),
  createFullTestUpload,
);
router.get("/full-tests/:id", authenticate, requireAdmin(), getFullTestUpload);
router.post(
  "/full-tests/:id/sections/:section/file",
  authenticate,
  requireAdmin(),
  fullTestPdfUpload.single("file"),
  replaceFullTestSection,
);
router.put("/full-tests/:id/sections/:section", authenticate, requireAdmin(), saveFullTestSectionReview);
router.post("/full-tests/:id/publish", authenticate, requireAdmin(), publishFullTestUpload);
router.delete("/full-tests/:id", authenticate, requireAdmin(), deleteFullTestUpload);

router.get("/", authenticate, requireAdmin(), getUploads);
router.get("/:id", authenticate, requireAdmin(), getUpload);
router.post("/practice-test", authenticate, requireAdmin(), upload.single("file"), uploadPracticeTest);
router.post("/practice-questions", authenticate, requireAdmin(), upload.single("file"), uploadPracticeQuestions);
router.post("/image", authenticate, requireAdmin(), imageUpload.single("image"), uploadImage);
router.post("/:id/extract", authenticate, requireAdmin(), triggerExtraction);
router.put("/:id/review", authenticate, requireAdmin(), reviewUpload);
router.post("/:id/publish", authenticate, requireAdmin(), publishUpload);
router.delete("/:id", authenticate, requireAdmin(), deleteUpload);

export default router;
