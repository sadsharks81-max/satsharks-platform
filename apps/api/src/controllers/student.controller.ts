import type { Request, Response } from "express";
import {
  engagementSettingsSchema,
  friendCodeSchema,
  leaderboardQuerySchema,
  mistakeQuerySchema,
  objectIdSchema,
  questionHistoryQuerySchema,
  type BankDrillInput,
  type RetryDrillInput,
} from "@satsharks/validation";
import type { UserDoc } from "@satsharks/db";
import { userAccess } from "../services/access.service";
import { analyticsService } from "../services/analytics.service";
import { engagementService } from "../services/engagement.service";
import { historyService } from "../services/history.service";
import { practiceService } from "../services/practice.service";
import { AppError } from "../utils/app-error";
import { sendOk } from "../utils/respond";

function me(req: Request): UserDoc {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}
const id = (req: Request) => String(me(req)._id);

// Free accounts see the limited analytics and mistake bank unless analytics are open to them.
async function fullAnalytics(req: Request): Promise<boolean> {
  return (await userAccess(me(req))).feature("analytics");
}

function parse<T>(result: { success: true; data: T } | { success: false; error: { issues: { message: string }[] } }, fallback: string): T {
  if (!result.success) throw AppError.badRequest(result.error.issues[0]?.message ?? fallback);
  return result.data;
}

export async function getTestHistory(req: Request, res: Response): Promise<void> {
  sendOk(res, { tests: await historyService.tests(id(req)) });
}

export async function getQuestionHistory(req: Request, res: Response): Promise<void> {
  sendOk(res, await historyService.questions(id(req), parse(questionHistoryQuerySchema.safeParse(req.query), "Check the filters")));
}

export async function getMistakes(req: Request, res: Response): Promise<void> {
  sendOk(res, await historyService.mistakes(id(req), parse(mistakeQuerySchema.safeParse(req.query), "Check the filters"), await fullAnalytics(req)));
}

export async function getAnalytics(req: Request, res: Response): Promise<void> {
  sendOk(res, await analyticsService.analytics(id(req), await fullAnalytics(req)));
}

export async function getEngagement(req: Request, res: Response): Promise<void> {
  sendOk(res, await engagementService.summary(me(req)));
}

export async function updateEngagement(req: Request, res: Response): Promise<void> {
  sendOk(res, { settings: await engagementService.updateSettings(me(req), parse(engagementSettingsSchema.safeParse(req.body), "Check the settings")) });
}

export async function getLeaderboard(req: Request, res: Response): Promise<void> {
  const query = parse(leaderboardQuerySchema.safeParse(req.query), "Check the leaderboard choice");
  sendOk(res, await engagementService.leaderboard(me(req), query.scope, query.period));
}

export async function addFriend(req: Request, res: Response): Promise<void> {
  sendOk(res, { friend: await engagementService.addFriend(me(req), parse(friendCodeSchema.safeParse(req.body), "Check the friend code").code) }, 201);
}

export async function removeFriend(req: Request, res: Response): Promise<void> {
  await engagementService.removeFriend(me(req), objectIdSchema.parse(req.params.id));
  sendOk(res, { removed: true });
}

export async function getShareCard(req: Request, res: Response): Promise<void> {
  sendOk(res, { card: await engagementService.shareCard(me(req)) });
}

export async function createBankDrill(req: Request, res: Response): Promise<void> {
  sendOk(res, { attempt: await practiceService.createBankDrill(id(req), req.body as BankDrillInput, await userAccess(me(req))) }, 201);
}

export async function createRetryDrill(req: Request, res: Response): Promise<void> {
  sendOk(res, { attempt: await practiceService.createRetryDrill(id(req), req.body as RetryDrillInput, await userAccess(me(req))) }, 201);
}
