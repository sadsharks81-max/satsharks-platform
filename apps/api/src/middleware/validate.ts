import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

// Replaces req.body with the parsed value, so controllers only ever see validated, stripped input.
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body);
    next();
  };
}
