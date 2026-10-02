import type { Response } from "express";
import type { ApiResponse } from "@satsharks/types";

export function sendOk<T>(res: Response, data: T, status = 200): void {
  const body: ApiResponse<T> = { ok: true, data };
  res.status(status).json(body);
}
