import type { Request, Response } from "express";
import { announcementSchema, objectIdSchema } from "@satsharks/validation";
import { announcementService } from "../services/announcement.service";
import { AppError } from "../utils/app-error";
import { sendOk } from "../utils/respond";

function input(req: Request) {
  const parsed = announcementSchema.safeParse(req.body);
  // The admin sees which field is wrong, not just "invalid request".
  if (!parsed.success) throw AppError.badRequest(parsed.error.issues[0]?.message ?? "Check the announcement fields");
  return parsed.data;
}

export async function listMyAnnouncements(req: Request, res: Response): Promise<void> {
  if (!req.user) throw AppError.unauthorized();
  sendOk(res, { announcements: await announcementService.forUser(req.user) });
}

export async function listAnnouncements(_req: Request, res: Response): Promise<void> {
  sendOk(res, { announcements: await announcementService.list() });
}

export async function createAnnouncement(req: Request, res: Response): Promise<void> {
  sendOk(res, { announcement: await announcementService.create(input(req), String(req.user!._id)) }, 201);
}

export async function updateAnnouncement(req: Request, res: Response): Promise<void> {
  sendOk(res, { announcement: await announcementService.update(objectIdSchema.parse(req.params.id), input(req)) });
}

export async function deleteAnnouncement(req: Request, res: Response): Promise<void> {
  await announcementService.remove(objectIdSchema.parse(req.params.id));
  sendOk(res, { deleted: true });
}
