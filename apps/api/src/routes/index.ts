import { Router } from "express";
import { getPricing, getSatDates } from "../controllers/admin.controller";
import { listMyAnnouncements } from "../controllers/announcement.controller";
import { requireAuth } from "../middleware/auth";
import { getAsset } from "../controllers/asset.controller";
import { getHealth } from "../controllers/health.controller";
import { requireDb } from "../middleware/require-db";
import { adminRouter } from "./admin.routes";
import { authRouter } from "./auth.routes";
import { billingRouter } from "./billing.routes";
import { getOffers, getProof } from "../controllers/billing.controller";
import { practiceRouter } from "./practice.routes";
import { studentRouter } from "./student.routes";

export const apiRouter = Router();

apiRouter.get("/health", getHealth);
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/practice", practiceRouter);
apiRouter.use("/student", studentRouter);
apiRouter.use("/billing", billingRouter);
// Public: real student numbers and the current offer for the landing and pricing pages.
apiRouter.get("/public/proof", requireDb, getProof);
apiRouter.get("/public/offers", requireDb, getOffers);
// Public: images are embedded in question content and carry no private data.
apiRouter.get("/assets/:key", requireDb, getAsset);
// Public: the plans and prices on the pricing page.
apiRouter.get("/pricing", requireDb, getPricing);
// Public: upcoming SAT test dates and deadlines (dates page and dashboard countdown).
apiRouter.get("/sat-dates", requireDb, getSatDates);
// The banners for the signed-in account.
apiRouter.get("/announcements", requireDb, requireAuth, listMyAnnouncements);
