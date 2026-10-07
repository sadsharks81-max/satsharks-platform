import crypto from "crypto";
import fs from "fs";
import multer, { type FileFilterCallback } from "multer";
import path from "path";
import type { Request } from "express";

export const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const IMAGE_MIME_TYPES = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/jpg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

/**
 * Builds the on-disk filename.
 *
 * The previous implementation used `path.extname(file.originalname)`, i.e. an
 * attacker-chosen extension. Because the mimetype filter trusts a client-supplied
 * Content-Type header, uploading `payload.html` labelled `application/pdf` wrote
 * a `.html` file into a directory served statically with
 * `Access-Control-Allow-Origin: *` , stored XSS on the API origin. The extension
 * is now derived from the accepted mimetype allowlist, never from user input.
 *
 * The random component also replaces `Math.round(Math.random() * 1e9)`: two
 * uploads inside the same millisecond could otherwise collide and overwrite.
 */
const makeFilename = (prefix: string, extension: string) =>
  `${prefix}${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;

const diskStorage = (prefix: string, resolveExtension: (mimetype: string) => string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, makeFilename(prefix, resolveExtension(file.mimetype))),
  });

const pdfFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (file.mimetype === "application/pdf") return cb(null, true);
  cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only PDF files are allowed"));
};

const imageFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (IMAGE_MIME_TYPES.has(file.mimetype)) return cb(null, true);
  cb(
    new multer.MulterError(
      "LIMIT_UNEXPECTED_FILE",
      "Only PNG, JPG, JPEG, WEBP, and GIF images are allowed",
    ),
  );
};

const PDF_SIZE_LIMIT = 50 * 1024 * 1024;
const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024;

/** `files: 1` stops a single request from smuggling extra attachments past `.single()`. */
const pdfUpload = (prefix: string) =>
  multer({
    storage: diskStorage(prefix, () => ".pdf"),
    fileFilter: pdfFileFilter,
    limits: { fileSize: PDF_SIZE_LIMIT, files: 1 },
  });

export const practiceTestUpload = pdfUpload("");

/**
 * Full-test section PDFs are parsed inside the upload request and only the
 * extracted questions are stored, so the file never needs to reach the disk.
 * Up to two files: the Reading & Writing PDF and the Math PDF.
 */
export const fullTestPdfUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: pdfFileFilter,
  limits: { fileSize: PDF_SIZE_LIMIT, files: 2 },
});
// Study materials are persisted to MongoDB GridFS by the controller. Keeping
// the bytes in memory avoids writing a temporary file to Railway's ephemeral
// filesystem, where it would disappear on restart or deploy.
export const studyMaterialUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: pdfFileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
});

export const paymentProofUpload = multer({
  storage: diskStorage("proof-", (mimetype) => IMAGE_MIME_TYPES.get(mimetype) ?? ".bin"),
  fileFilter: imageFileFilter,
  limits: { fileSize: IMAGE_SIZE_LIMIT, files: 1 },
});

/** Images destined for Cloudinary (or a base64 fallback) never touch the disk. */
export const memoryImageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: IMAGE_SIZE_LIMIT, files: 1 },
});
