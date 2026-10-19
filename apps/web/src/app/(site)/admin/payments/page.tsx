"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney, PAID_PLAN_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, type AdminStats, type PaymentStatus, type PaymentSummary } from "@satsharks/types";
import { RequireUser } from "@/components/require-user";
import { Badge, Button, Card, Modal, Notice, PageHeader, Spinner, Toggle } from "@/components/ui";
import { api } from "@/lib/api";

type PaymentList = { payments: PaymentSummary[]; total: number; page: number; pageSize: number };

const PAGE_SIZE = 25;
const selectClass = "h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none focus:border-brand-500";
const TABS: { id: PaymentStatus | ""; label: string }[] = [
  { id: "review", label: "To approve" },
  { id: "", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "rejected", label: "Rejected" },
  { id: "failed", label: "Failed" },
];
const STATUS_TONE: Record<PaymentStatus, "green" | "amber" | "red" | "neutral"> = { paid: "green", review: "amber", rejected: "red", failed: "red", pending: "neutral" };

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function Payments({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PaymentStatus | "">("review");
  const [currency, setCurrency] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState<{ payment: PaymentSummary; decision: "approve" | "reject" } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const cleared = useRef(false);

  // Opening this page clears the red badge in the sidebar.
  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    void api("/api/admin/payments/seen", { method: "POST" })
      .then(() => queryClient.setQueryData<AdminStats>(["admin", "stats"], (stats) => (stats ? { ...stats, payments: { ...stats.payments, unseen: 0 } } : stats)))
      .catch(() => undefined);
  }, [queryClient]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = new URLSearchParams({ status: tab, currency, search, page: String(page), pageSize: String(PAGE_SIZE) });
  const list = useQuery({
    queryKey: ["admin", "payments", params.toString()],
    queryFn: () => api<PaymentList>(`/api/admin/payments?${params.toString()}`),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => api<AdminStats>("/api/admin/stats"), staleTime: 30_000 });
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));

  async function review() {
    if (!reviewing) return;
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/admin/payments/${reviewing.payment.id}/review`, { method: "POST", body: { decision: reviewing.decision, note } });
      setMessage({
        tone: "info",
        text:
          reviewing.decision === "approve"
            ? `Approved. ${reviewing.payment.user?.name ?? "The student"} is upgraded now and has been emailed a receipt.`
            : `Rejected. ${reviewing.payment.user?.name ?? "The student"} has been emailed.`,
      });
      setReviewing(null);
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (caught) {
      setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "Could not save" });
    } finally {
      setBusy(false);
    }
  }

  const revenue = stats.data?.revenue;

  return (
    <>
      <PageHeader title="Payments" subtitle="Every payment, newest first. Transfers wait here until you check your account and approve them." />

      {revenue && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Card>
            <div className="text-2xl font-bold">{stats.data!.payments.toReview}</div>
            <div className="text-sm text-slate-600">Transfers to approve</div>
          </Card>
          <Card>
            <div className="text-2xl font-bold">{formatMoney(revenue.PKR.month, "PKR")}</div>
            <div className="text-sm text-slate-600">This month · {formatMoney(revenue.PKR.total, "PKR")} in all</div>
          </Card>
          <Card>
            <div className="text-2xl font-bold">{formatMoney(revenue.USD.month, "USD")}</div>
            <div className="text-sm text-slate-600">This month · {formatMoney(revenue.USD.total, "USD")} in all</div>
          </Card>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <Toggle
            key={entry.label}
            active={tab === entry.id}
            onClick={() => {
              setTab(entry.id);
              setPage(1);
            }}
          >
            {entry.label}
            {entry.id === "review" && stats.data ? ` (${stats.data.payments.toReview})` : ""}
          </Toggle>
        ))}
      </div>

      <Card className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-bold">
          Search
          <input className={`${selectClass} px-3`} value={searchInput} maxLength={100} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name, email, phone, transaction ID or receipt" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Currency
          <select className={selectClass} value={currency} onChange={(event) => (setCurrency(event.target.value), setPage(1))}>
            <option value="">PKR and USD</option>
            <option value="PKR">PKR (Pakistan)</option>
            <option value="USD">USD (International)</option>
          </select>
        </label>
      </Card>

      {message && (
        <div className="mb-4">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
      {list.isLoading && <Spinner label="Loading payments" />}
      {list.error && <Notice tone="error">{list.error.message}</Notice>}
      {list.data && list.data.payments.length === 0 && <Notice tone="info">{tab === "review" ? "No transfers are waiting. You are all caught up." : "No payments match."}</Notice>}

      {list.data && list.data.payments.length > 0 && (
        <Card className={`p-0 ${list.isFetching ? "opacity-60" : ""}`}>
          <ul className="divide-y divide-slate-200">
            {list.data.payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {payment.user ? (
                      <Link href={`/admin/users/${payment.user.id}`} className="font-bold text-brand-500 hover:underline">
                        {payment.user.name}
                      </Link>
                    ) : (
                      <span className="font-bold">Removed account</span>
                    )}
                    <Badge tone={STATUS_TONE[payment.status]}>{PAYMENT_STATUS_LABELS[payment.status]}</Badge>
                    {!payment.seen && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">New</span>}
                  </div>
                  <p className="truncate text-sm text-slate-600">{payment.user?.email}</p>
                  <p className="mt-1 text-sm">
                    <b>{formatMoney(payment.amount, payment.currency)}</b>
                    {payment.discountPercent > 0 && <span className="text-slate-500"> ({payment.discountPercent}% offer, list {formatMoney(payment.listAmount, payment.currency)})</span>} ·{" "}
                    {payment.method === "referral" ? "Free week (friend invites)" : PAID_PLAN_LABELS[payment.plan]} · {PAYMENT_METHOD_LABELS[payment.method]}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {when(payment.createdAt)}
                    {payment.reference && payment.method !== "card" && (
                      <>
                        {" "}
                        · Transaction ID <b className="font-mono text-slate-700">{payment.reference}</b>
                      </>
                    )}
                    {payment.receiptNumber && <> · Receipt {payment.receiptNumber}</>}
                  </p>
                  {payment.note && <p className="mt-1 text-xs text-slate-600">Student&apos;s note: {payment.note}</p>}
                  {payment.reviewNote && <p className="mt-1 text-xs text-slate-600">Your note: {payment.reviewNote}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {payment.status === "review" && canWrite && (
                    <>
                      <Button size="sm" disabled={busy} onClick={() => setReviewing({ payment, decision: "approve" })}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setReviewing({ payment, decision: "reject" })}>
                        Reject
                      </Button>
                    </>
                  )}
                  {payment.status === "paid" && (
                    <Link href={`/receipts/${payment.id}`} className="rounded-lg border border-slate-900 px-3 py-1.5 text-xs font-bold hover:bg-slate-100">
                      Receipt
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-slate-900 px-4 py-3 text-sm">
            <span>
              {list.data.total.toLocaleString()} payment{list.data.total === 1 ? "" : "s"} · page <b>{page}</b> of <b>{pages}</b>
            </span>
            <span className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </span>
          </div>
        </Card>
      )}

      {reviewing && (
        <Modal title={reviewing.decision === "approve" ? "Approve this payment?" : "Reject this payment?"} onClose={() => !busy && setReviewing(null)}>
          <p className="text-sm text-slate-700">
            {reviewing.decision === "approve" ? (
              <>
                Check that <b>{formatMoney(reviewing.payment.amount, reviewing.payment.currency)}</b> with transaction ID <b className="font-mono">{reviewing.payment.reference}</b> reached
                your {PAYMENT_METHOD_LABELS[reviewing.payment.method]} account. {reviewing.payment.user?.name} gets the {PAID_PLAN_LABELS[reviewing.payment.plan]} plan at once and a
                receipt by email.
              </>
            ) : (
              <>{reviewing.payment.user?.name} is emailed that the payment could not be confirmed, with your note. Nothing changes on the account.</>
            )}
          </p>
          <label className="mt-4 block text-xs font-bold">
            Note {reviewing.decision === "reject" ? "to the student" : "(only admins see it)"}
            <input className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button variant={reviewing.decision === "approve" ? "primary" : "danger"} disabled={busy} onClick={review}>
              {busy ? "Saving…" : reviewing.decision === "approve" ? "Approve and upgrade" : "Reject"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function AdminPaymentsPage() {
  return <RequireUser permission="payments:read">{(me) => <Payments canWrite={me.permissions.includes("payments:write")} />}</RequireUser>;
}
