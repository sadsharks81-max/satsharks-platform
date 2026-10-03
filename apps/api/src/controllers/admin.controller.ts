import type { Request, Response } from "express";
import {
  adaptiveSettingsSchema,
  bulkPaperStatusSchema,
  objectIdSchema,
  paperStatusSchema,
  questionListQuerySchema,
  type UpdateQuestionInput,
} from "@satsharks/validation";
import { adminService } from "../services/admin.service";
import { settingsService } from "../services/settings.service";
import { sendOk } from "../utils/respond";

export async function getStats(_req: Request, res: Response): Promise<void> {
  sendOk(res, await adminService.stats());
}

export async function setPaperStatus(req: Request, res: Response): Promise<void> {
  const id = objectIdSchema.parse(req.params.id);
  const { status } = paperStatusSchema.parse(req.body);
  sendOk(res, await adminService.setPaperStatus(status, [id]));
}

export async function setPapersStatus(req: Request, res: Response): Promise<void> {
  const { status, ids } = bulkPaperStatusSchema.parse(req.body);
  sendOk(res, await adminService.setPaperStatus(status, ids));
}

export async function getFacets(_req: Request, res: Response): Promise<void> {
  sendOk(res, { topics: await adminService.facets() });
}

export async function listQuestions(req: Request, res: Response): Promise<void> {
  sendOk(res, await adminService.listQuestions(questionListQuerySchema.parse(req.query)));
}

export async function getQuestion(req: Request, res: Response): Promise<void> {
  sendOk(res, { question: await adminService.getQuestion(objectIdSchema.parse(req.params.id)) });
}

export async function updateQuestion(req: Request, res: Response): Promise<void> {
  const id = objectIdSchema.parse(req.params.id);
  sendOk(res, { question: await adminService.updateQuestion(id, req.body as UpdateQuestionInput) });
}

export async function getAdaptiveSettings(_req: Request, res: Response): Promise<void> {
  sendOk(res, await settingsService.getAdaptive());
}

export async function setAdaptiveSettings(req: Request, res: Response): Promise<void> {
  const settings = adaptiveSettingsSchema.parse(req.body);
  sendOk(res, await settingsService.setAdaptive(settings, String(req.user!._id)));
}

export async function deleteQuestion(req: Request, res: Response): Promise<void> {
  await adminService.deleteQuestion(objectIdSchema.parse(req.params.id));
  sendOk(res, { deleted: true });
}
