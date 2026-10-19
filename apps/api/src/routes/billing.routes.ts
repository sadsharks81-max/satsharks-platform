import { Router } from "express";
import {
  completeTestPayment,
  getBilling,
  getCheckout,
  getReceipt,
  setAutoRenew,
  startCardPayment,
  submitManualPayment,
} from "../controllers/billing.controller";
import { requireAuth } from "../middleware/auth";
import { paymentRateLimit } from "../middleware/rate-limit";
import { requireDb } from "../middleware/require-db";

// The signed-in student's plan, payments and receipts (proposal 4.1).
export const billingRouter = Router();

billingRouter.use(requireDb, requireAuth);

billingRouter.get("/", getBilling);
billingRouter.get("/checkout", getCheckout);
billingRouter.post("/payments", paymentRateLimit, submitManualPayment);
billingRouter.post("/card", paymentRateLimit, startCardPayment);
// The test gateway's pretend checkout page (answers 404 unless PAYMENTS_TEST_GATEWAY=on outside production).
billingRouter.post("/test-gateway/:id", completeTestPayment);
billingRouter.put("/auto-renew", setAutoRenew);
billingRouter.get("/receipts/:id", getReceipt);
