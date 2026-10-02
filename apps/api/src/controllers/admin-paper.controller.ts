import type { Request, Response } from "express";
import { objectIdSchema } from "@satsharks/validation";
import { paperService } from "../services/paper.service";
import { sendOk } from "../utils/respond";

export async function listPapers(_req: Request, res: Response): Promise<void> {
  sendOk(res, { papers: await paperService.list() });
}

export async function getPaper(req: Request, res: Response): Promise<void> {
  const id = objectIdSchema.parse(req.params.id);
  sendOk(res, await paperService.getWithQuestions(id));
}
