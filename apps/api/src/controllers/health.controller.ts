import type { Request, Response } from "express";
import { isMongoConnected } from "@satsharks/db";
import { env } from "../config/env";
import { sendOk } from "../utils/respond";

export function getHealth(_req: Request, res: Response): void {
  sendOk(res, {
    status: "ok",
    service: "sat-sharks-api",
    environment: env.NODE_ENV,
    database: isMongoConnected() ? "connected" : env.MONGODB_URI ? "disconnected" : "not_configured",
    uptimeSeconds: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
}
