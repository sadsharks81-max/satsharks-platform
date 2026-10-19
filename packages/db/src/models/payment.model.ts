import mongoose from "mongoose";
import { CURRENCIES, PAID_PLANS, PAYMENT_METHODS, PAYMENT_STATUSES, type Currency, type PaidPlan, type PaymentMethod, type PaymentStatus } from "@satsharks/types";

const { Schema } = mongoose;

// One payment for a paid plan (proposal 4.1): a card checkout through a gateway, a transfer the
// student made outside the site and an admin approves, or a free week earned with friend invites.
// The plan is given only when the payment becomes "paid" (paymentService.markPaid), once.
export interface PaymentDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  plan: PaidPlan;
  currency: Currency;
  // Main currency unit (rupees, dollars), after any discount.
  amount: number;
  listAmount: number;
  discountPercent: number;
  // The one-time exit offer was applied.
  usedOffer: boolean;
  method: PaymentMethod;
  status: PaymentStatus;
  // The gateway's name ("test", later the real one) for card payments.
  gateway: string | null;
  // Transfer: the student's transaction ID. Card: the gateway's payment / session ID.
  reference: string | null;
  note: string | null;
  receiptNumber: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  paidAt: Date | null;
  reviewedBy: mongoose.Types.ObjectId | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  // Admins opened the Payments page after it arrived (red badge in the sidebar).
  seenAt: Date | null;
  // The alert email to the owner went out (sent once).
  alertSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: String, enum: PAID_PLANS, required: true },
    currency: { type: String, enum: CURRENCIES, required: true },
    amount: { type: Number, required: true, min: 0 },
    listAmount: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0 },
    usedOffer: { type: Boolean, default: false },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    status: { type: String, enum: PAYMENT_STATUSES, required: true, index: true },
    gateway: { type: String, default: null },
    reference: { type: String, default: null, trim: true, maxlength: 200 },
    note: { type: String, default: null, maxlength: 500 },
    receiptNumber: { type: String, default: null },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: null, maxlength: 300 },
    seenAt: { type: Date, default: null },
    alertSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The admin list (newest first) and the unseen badge.
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ seenAt: 1, status: 1 });
// A gateway's payment ID is used once.
paymentSchema.index({ gateway: 1, reference: 1 }, { unique: true, partialFilterExpression: { gateway: { $type: "string" }, reference: { $type: "string" } } });

export const PaymentModel =
  (mongoose.models.Payment as mongoose.Model<PaymentDoc> | undefined) ?? mongoose.model<PaymentDoc>("Payment", paymentSchema);
