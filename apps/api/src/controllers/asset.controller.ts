import type { Request, Response } from "express";
import { AssetModel } from "@satsharks/db";
import { AppError } from "../utils/app-error";

const KEY_PATTERN = /^[a-f0-9]{32}\.(svg|png|jpg|webp)$/;

// Serves a hosted question image. Files are content-addressed and never change, so they are
// cached for a year.
export async function getAsset(req: Request, res: Response): Promise<void> {
  const key = String(req.params.key);
  if (!KEY_PATTERN.test(key)) throw AppError.notFound("Asset not found");
  const asset = await AssetModel.findOne({ key }).lean();
  if (!asset) throw AppError.notFound("Asset not found");

  res.set({
    "Content-Type": asset.contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    // SVG can carry scripts. These headers make sure one opened directly can run nothing.
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  // .lean() returns the BSON Binary wrapper, not a Buffer.
  const data = asset.data as unknown as { buffer?: Uint8Array } | Buffer;
  res.send(Buffer.isBuffer(data) ? data : Buffer.from((data as { buffer: Uint8Array }).buffer));
}
