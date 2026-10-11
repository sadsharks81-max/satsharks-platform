import { Router } from "express";
import { getPricing, getSatDates } from "../controllers/admin.controller";
import { listMyAnnouncements } from "../controllers/announcement.controller";
import { requireAuth } from "../middleware/auth";
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
// Public: the plans and prices on the pricing page.
apiRouter.get("/pricing", requireDb, getPricing);
// Public: upcoming SAT test dates and deadlines (dates page and dashboard countdown).
apiRouter.get("/sat-dates", requireDb, getSatDates);
// The banners for the signed-in account.
apiRouter.get("/announcements", requireDb, requireAuth, listMyAnnouncements);
