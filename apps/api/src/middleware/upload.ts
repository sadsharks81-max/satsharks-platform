import multer from "multer";
import { AppError } from "../utils/app-error";

// Uploaded files are kept in memory and never written to disk: test PDFs are read during the
// request and only their questions are stored; images go into MongoDB (see AssetModel).

const MB = 1024 * 1024;

// The two section PDFs of an uploaded practice test (or one, when a section is re-uploaded).
export const testPdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * MB, files: 2, fields: 10 },
  fileFilter: (_req, file, done) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) done(null, true);
    else done(AppError.badRequest(`"${file.originalname}" is not a PDF`));
  },
});

// One question image. Its type is checked from the bytes by the service.
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * MB, files: 1, fields: 5 },
});
