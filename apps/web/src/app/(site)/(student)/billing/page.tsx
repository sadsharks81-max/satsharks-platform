"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  formatMoney,
  PAID_PLAN_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type Billing,
  type PaymentStatus,
} from "@satsharks/types";
import { InviteFriends } from "@/components/invite-friends";
import { Badge, Button, Card, Modal, Notice, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { ME_QUERY_KEY } from "@/lib/auth";
import { BILLING_QUERY_KEY, daysUntil, formatDate, useBilling } from "@/lib/billing";

const STATUS_TONE: Record<PaymentStatus, "green" | "amber" | "red" | "neutral"> = { paid: "green", review: "amber", rejected: "red", failed: "red", pending: "neutral" };

function PlanCard({ billing }: { billing: Billing }) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paid = billing.plan === "paid";

  async function setAutoRenew(autoRenew: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/billing/auto-renew", { method: "PUT", body: { autoRenew } });
      queryClient.setQueryData<Billing>(BILLING_QUERY_KEY, (current) => (current ? { ...current, autoRenew } : current));
      setConfirm(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Your plan</p>
          <p className="mt-1 text-2xl font-bold">{paid ? (billing.paidPlan ? PAID_PLAN_LABELS[billing.paidPlan] : "Paid") : "Free"}</p>
          <p className="mt-1 text-sm text-slate-600">
            {paid
              ? billing.planExpiresAt
                ? `Everything unlocked until ${formatDate(billing.planExpiresAt)} (${daysUntil(billing.planExpiresAt)} day${daysUntil(billing.planExpiresAt) === 1 ? "" : "s"} left).`
                : "Everything unlocked, with no end date."
              : "Two full papers, a daily drill allowance and your score. Upgrade for every paper, unlimited drills and full analytics."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {paid && billing.planExpiresAt && (
            <Link href={`/checkout?plan=${billing.paidPlan ?? "monthly"}`} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
              Renew now
            </Link>
          )}
          {!paid && (
            <Link href="/pricing" className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
              See plans
            </Link>
          )}
        </div>
      </div>
      {paid && billing.planExpiresAt && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm">
          <span className="text-slate-600">
            {billing.autoRenew
              ? "Renewal reminder: on. We email you two days before your plan ends. Nothing is ever charged automatically."
              : `Renewal cancelled. Your plan ends on ${formatDate(billing.planExpiresAt)}, then your account moves to the free plan; your history is kept.`}
          </span>
          {billing.autoRenew ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm(true)}>
              Cancel renewal
            </Button>
          ) : (
            <Button size="sm" disabled={busy} onClick={() => setAutoRenew(true)}>
              Turn renewal back on
            </Button>
          )}
        </div>
      )}
      {error && (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {confirm && billing.planExpiresAt && (
        <Modal title="Cancel renewal?" onClose={() => !busy && setConfirm(false)}>
          <p className="text-sm text-slate-700">
            You keep everything until <b>{formatDate(billing.planExpiresAt)}</b>. After that your account moves to the free plan. Your scores, history, mistakes and streak are kept, and
            you can renew any time.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>
              Keep renewal
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => setAutoRenew(false)}>
              {busy ? "Saving…" : "Cancel renewal"}
            </Button>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function BillingPage() {
  const queryClient = useQueryClient();
  const search = useSearchParams();
  const billing = useBilling();
  const returned = search.get("payment");

  // Back from a card checkout: the account may have just changed.
  useEffect(() => {
    if (returned) void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
  }, [returned, queryClient]);

  if (billing.isLoading) return <Spinner label="Loading your plan" />;
  if (billing.error || !billing.data) return <Notice tone="error">{billing.error?.message ?? "Could not load your plan"}</Notice>;
  const data = billing.data;
  const waiting = data.payments.find((payment) => payment.status === "review");
  const justPaid = returned ? data.payments.find((payment) => payment.id === returned) : undefined;

  return (
    <>
      <PageHeader title="Plan & billing" subtitle="Your plan, payments and receipts, and free weeks from inviting friends." />
      <div className="grid gap-4">
        {justPaid?.status === "paid" && <Notice tone="info">Payment received. Your account is upgraded and a receipt is on its way to your email.</Notice>}
        {returned && justPaid && justPaid.status !== "paid" && <Notice tone="error">The payment did not go through. Nothing was charged; you can try again.</Notice>}
        {waiting && (
          <Notice tone="info">
            Your {PAYMENT_METHOD_LABELS[waiting.method]} payment of {formatMoney(waiting.amount, waiting.currency)} (transaction ID {waiting.reference}) is waiting for approval. We
            check transfers by hand, usually within a few hours, and email you when your account is upgraded.
          </Notice>
        )}
        <PlanCard billing={data} />
        {data.offer && data.plan === "free" && (
          <Card className="flex flex-wrap items-center justify-between gap-3 border-brand-500">
            <div>
              <h2 className="font-bold">Your one-time offer: {data.offer.percentOff}% off</h2>
              <p className="text-sm text-slate-600">Use it once, on any plan.</p>
            </div>
            <Link href="/checkout?plan=three_months&offer=1" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">
              Use my offer
            </Link>
          </Card>
        )}
        <InviteFriends billing={data} />
        <Card className="p-0">
          <h2 className="border-b border-slate-900 px-5 py-4 font-bold">Payments</h2>
          {data.payments.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-600">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {data.payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div>
                    <p className="font-bold">
                      {payment.method === "referral" ? "Free week (friend invites)" : PAID_PLAN_LABELS[payment.plan]} · {formatMoney(payment.amount, payment.currency)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(payment.createdAt)} · {PAYMENT_METHOD_LABELS[payment.method]}
                      {payment.periodEnd && payment.status === "paid" && ` · until ${formatDate(payment.periodEnd)}`}
                    </p>
                    {payment.status === "rejected" && payment.reviewNote && <p className="text-xs text-red-700">{payment.reviewNote}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[payment.status]}>{PAYMENT_STATUS_LABELS[payment.status]}</Badge>
                    {payment.status === "paid" && (
                      <Link href={`/receipts/${payment.id}`} className="rounded-lg border border-slate-900 px-3 py-1.5 text-xs font-bold hover:bg-slate-100">
                        Receipt
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Spinner label="Loading your plan" />}>
      <BillingPage />
    </Suspense>
  );
}
