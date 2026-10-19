"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatMoney, PAID_PLAN_LABELS, PAYMENT_METHOD_LABELS, type PaymentSummary, type PublicUser } from "@satsharks/types";
import { Logo } from "@/components/logo";
import { RequireUser } from "@/components/require-user";
import { Button, Notice, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/billing";

// A printable receipt. Students open their own; admins (payments:read) any.
function Receipt({ id, me }: { id: string; me: PublicUser }) {
  const admin = me.permissions.includes("payments:read");
  const query = useQuery({
    queryKey: ["receipt", id],
    queryFn: () => api<{ payment: PaymentSummary }>(admin ? `/api/admin/payments/${id}/receipt` : `/api/billing/receipts/${id}`),
  });
  if (query.isLoading) return <Spinner label="Loading the receipt" />;
  if (query.error || !query.data) return <Notice tone="error">{query.error?.message ?? "Receipt not found"}</Notice>;
  const payment = query.data.payment;
  const rows: [string, string][] = [
    ["Receipt number", payment.receiptNumber ?? "—"],
    ["Date paid", payment.paidAt ? formatDate(payment.paidAt) : "—"],
    ["Billed to", payment.user ? `${payment.user.name} (${payment.user.email})` : "—"],
    ["Plan", payment.method === "referral" ? "Free week (friend invites)" : `SAT Sharks ${PAID_PLAN_LABELS[payment.plan]}`],
    ["Access", payment.periodStart && payment.periodEnd ? `${formatDate(payment.periodStart)} to ${formatDate(payment.periodEnd)}` : "No end date"],
    ["Paid with", PAYMENT_METHOD_LABELS[payment.method] + (payment.reference && payment.method !== "card" && payment.method !== "referral" ? ` · ${payment.reference}` : "")],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={admin ? "/admin/payments" : "/billing"} className="text-sm font-bold text-brand-500 hover:underline">
          ← {admin ? "Payments" : "Plan & billing"}
        </Link>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          Print or save as PDF
        </Button>
      </div>
      <article className="rounded-2xl border border-slate-900 bg-white p-6 sm:p-10 print:border-0 print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <Logo className="h-10 w-auto text-brand-500" />
          <div className="text-right">
            <h1 className="text-2xl font-bold">Receipt</h1>
            <p className="text-sm text-slate-600">{payment.receiptNumber}</p>
          </div>
        </div>
        <dl className="mt-8 divide-y divide-slate-200 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[9rem_1fr] gap-4 py-2.5">
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex items-baseline justify-between border-t-2 border-slate-900 pt-4">
          <span className="font-bold">Total paid</span>
          <span className="text-2xl font-bold">{formatMoney(payment.amount, payment.currency)}</span>
        </div>
        {payment.discountPercent > 0 && (
          <p className="mt-1 text-right text-xs text-slate-500">
            List price {formatMoney(payment.listAmount, payment.currency)}, {payment.discountPercent}% one-time offer applied
          </p>
        )}
        <p className="mt-8 text-xs text-slate-500">SAT Sharks · Digital SAT practice · All payments are final.</p>
      </article>
    </div>
  );
}

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  return <RequireUser>{(me) => <Receipt id={id} me={me} />}</RequireUser>;
}
