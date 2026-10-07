import type { Request, Response } from "express";
import {
  adaptiveSettingsSchema,
  bulkPaperStatusSchema,
  conversionTablesSchema,
  objectIdSchema,
  pricingContentSchema,
  paperStatusSchema,
  questionListQuerySchema,
  reopenReportSchema,
  reportListQuerySchema,
  resolveReportSchema,
  updateUserSchema,
  userListQuerySchema,
  type UpdateQuestionInput,
} from "@satsharks/validation";
import type { PricingContent } from "@satsharks/types";
import { adminService } from "../services/admin.service";
import { reportService } from "../services/report.service";
import { userAdminService } from "../services/user-admin.service";
import { settingsService } from "../services/settings.service";
import { AppError } from "../utils/app-error";
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

export async function uploadImage(req: Request, res: Response): Promise<void> {
  if (!req.file) throw AppError.badRequest("Choose an image");
  sendOk(res, await adminService.uploadImage(req.file), 201);
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

export async function getConversionTables(_req: Request, res: Response): Promise<void> {
  sendOk(res, await settingsService.getConversionTables());
}

export async function setConversionTables(req: Request, res: Response): Promise<void> {
  const tables = conversionTablesSchema.parse(req.body);
  sendOk(res, await settingsService.setConversionTables(tables, String(req.user!._id)));
}

export async function getPricing(_req: Request, res: Response): Promise<void> {
  sendOk(res, await settingsService.getPricing());
}

export async function setPricing(req: Request, res: Response): Promise<void> {
  const parsed = pricingContentSchema.safeParse(req.body);
  // The admin sees which field is wrong, not just "invalid request".
  if (!parsed.success) throw AppError.badRequest(parsed.error.issues[0]?.message ?? "Check the pricing fields");
  sendOk(res, await settingsService.setPricing(parsed.data as PricingContent, String(req.user!._id)));
}

export async function listReports(req: Request, res: Response): Promise<void> {
  sendOk(res, await reportService.list(reportListQuerySchema.parse(req.query)));
}

export async function getReport(req: Request, res: Response): Promise<void> {
  sendOk(res, await reportService.get(objectIdSchema.parse(req.params.id)));
}

export async function resolveReport(req: Request, res: Response): Promise<void> {
  const input = resolveReportSchema.parse(req.body);
  sendOk(res, await reportService.resolve(objectIdSchema.parse(req.params.id), String(req.user!._id), input));
}

export async function reopenReport(req: Request, res: Response): Promise<void> {
  const { note } = reopenReportSchema.parse(req.body);
  await reportService.reopen(objectIdSchema.parse(req.params.id), String(req.user!._id), note);
  sendOk(res, { reopened: true });
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  sendOk(res, await userAdminService.list(userListQuerySchema.parse(req.query)));
}

export async function getUser(req: Request, res: Response): Promise<void> {
  sendOk(res, await userAdminService.get(objectIdSchema.parse(req.params.id)));
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const input = updateUserSchema.parse(req.body);
  sendOk(res, { user: await userAdminService.update(objectIdSchema.parse(req.params.id), String(req.user!._id), input) });
}
