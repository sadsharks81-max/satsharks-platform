import { Router } from "express";
import { getAsset } from "../controllers/asset.controller";
import { getHealth } from "../controllers/health.controller";
import { requireDb } from "../middleware/require-db";
import { adminRouter } from "./admin.routes";
import { authRouter } from "./auth.routes";
import { practiceRouter } from "./practice.routes";

export const apiRouter = Router();

apiRouter.get("/health", getHealth);
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/practice", practiceRouter);
// Public: images are embedded in question content and carry no private data.
apiRouter.get("/assets/:key", requireDb, getAsset);
