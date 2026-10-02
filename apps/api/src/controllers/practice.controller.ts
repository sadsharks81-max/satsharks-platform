import type { Request, Response } from "express";
import {
  objectIdSchema,
  positionSchema,
  type CreateAttemptInput,
  type SaveAnswerInput,
} from "@satsharks/validation";
import { practiceService } from "../services/practice.service";
import { AppError } from "../utils/app-error";
import { sendOk } from "../utils/respond";

function userId(req: Request): string {
  if (!req.user) throw AppError.unauthorized();
  return String(req.user._id);
}
const attemptId = (req: Request) => objectIdSchema.parse(req.params.id);
const position = (req: Request) => positionSchema.parse(req.params.position);

export async function getCatalog(_req: Request, res: Response): Promise<void> {
  sendOk(res, await practiceService.catalog());
}

export async function createAttempt(req: Request, res: Response): Promise<void> {
  sendOk(res, { attempt: await practiceService.createAttempt(userId(req), req.body as CreateAttemptInput) }, 201);
}

export async function listAttempts(req: Request, res: Response): Promise<void> {
  sendOk(res, { attempts: await practiceService.listAttempts(userId(req)) });
}

export async function getAttempt(req: Request, res: Response): Promise<void> {
  sendOk(res, await practiceService.getAttempt(userId(req), attemptId(req)));
}

export async function getQuestion(req: Request, res: Response): Promise<void> {
  sendOk(res, { question: await practiceService.getQuestion(userId(req), attemptId(req), position(req)) });
}

export async function saveAnswer(req: Request, res: Response): Promise<void> {
  sendOk(res, { item: await practiceService.saveAnswer(userId(req), attemptId(req), position(req), req.body as SaveAnswerInput) });
}

export async function checkQuestion(req: Request, res: Response): Promise<void> {
  sendOk(res, { question: await practiceService.checkQuestion(userId(req), attemptId(req), position(req)) });
}

export async function endAttempt(req: Request, res: Response): Promise<void> {
  sendOk(res, { attempt: await practiceService.endAttempt(userId(req), attemptId(req)) });
}

export async function getResult(req: Request, res: Response): Promise<void> {
  sendOk(res, await practiceService.getResult(userId(req), attemptId(req)));
}
