"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CURRENCIES, MANUAL_PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type Currency, type ManualPaymentMethod, type PaymentSettings } from "@satsharks/types";
import { api } from "@/lib/api";
import { Button, Card, Notice, Spinner } from "./ui";

const QUERY_KEY = ["admin", "settings", "payments"] as const;
const input = "h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-normal outline-none focus:border-brand-500";
const label = "block text-xs font-bold text-slate-600";

const PLACEHOLDERS: Record<ManualPaymentMethod, string> = {
  bank_transfer: "Account title: SAT Sharks\nBank: …\nIBAN: PK00 …\nAccount number: …",
  jazzcash: "JazzCash account: 03xx xxxxxxx\nAccount name: …",
  easypaisa: "Easypaisa account: 03xx xxxxxxx\nAccount name: …",
};

// Ways to pay, where payment alerts go, the exit offer and friend invites (proposal 4.1, 4.2).
// Card payments arrive once SAT Sharks confirms its payment gateway.
export function PaymentSettingsCard({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: () => api<PaymentSettings>("/api/admin/settings/payments") });
  const [draft, setDraft] = useState<PaymentSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    if (query.data && draft === null) setDraft(query.data);
  }, [query.data, draft]);

  if (query.isLoading || (!draft && !query.error)) {
    return (
      <Card>
        <Spinner label="Loading payment settings" />
      </Card>
    );
  }
  if (query.error || !draft) return <Notice tone="error">{query.error?.message ?? "Could not load the payment settings"}</Notice>;

  const setMethod = (method: ManualPaymentMethod, patch: Partial<PaymentSettings["manual"][ManualPaymentMethod]>) =>
    setDraft({ ...draft, manual: { ...draft.manual, [method]: { ...draft.manual[method], ...patch } } });
  const toggleCurrency = (method: ManualPaymentMethod, currency: Currency) => {
    const current = draft.manual[method].currencies;
    setMethod(method, { currencies: current.includes(currency) ? current.filter((entry) => entry !== currency) : [...current, currency] });
  };

  async function save() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await api<PaymentSettings>("/api/admin/settings/payments", { method: "PUT", body: draft });
      queryClient.setQueryData(QUERY_KEY, saved);
      setDraft(saved);
      setMessage({ tone: "info", text: "Saved. Checkout and the pricing page use these settings now." });
    } catch (caught) {
      setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="font-bold">Payments</h2>
      <p className="mt-1 text-sm text-slate-600">
        Ways students can pay, where new-payment alerts go, the one-time offer on the pricing page and friend invites. Transfers wait in Payments until you approve them; the
        account is upgraded the moment you do. Card payments are added once the payment gateway is chosen.
      </p>

      <fieldset disabled={!canWrite || saving} className="mt-4 grid gap-4 lg:grid-cols-3">
        {MANUAL_PAYMENT_METHODS.map((method) => {
          const entry = draft.manual[method];
          return (
            <div key={method} className={`rounded-xl border p-4 ${entry.enabled ? "border-brand-500" : "border-slate-300"}`}>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={entry.enabled} onChange={(event) => setMethod(method, { enabled: event.target.checked })} />
                {PAYMENT_METHOD_LABELS[method]}
              </label>
              <label className={`${label} mt-3`}>
                Account details shown to students
                <textarea
                  className={`${input} mt-1 h-28 resize-y py-2`}
                  value={entry.instructions}
                  maxLength={600}
                  placeholder={PLACEHOLDERS[method]}
                  onChange={(event) => setMethod(method, { instructions: event.target.value })}
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-600">
                {CURRENCIES.map((currency) => (
                  <label key={currency} className="flex items-center gap-1.5">
                    <input type="checkbox" className="accent-brand-500" checked={entry.currencies.includes(currency)} onChange={() => toggleCurrency(method, currency)} />
                    {currency}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </fieldset>

      <fieldset disabled={!canWrite || saving} className="mt-4 grid gap-4 lg:grid-cols-3">
        <label className={label}>
          Payment alert email (your Gmail)
          <input
            type="email"
            className={`${input} mt-1`}
            value={draft.alertEmail}
            placeholder="owner@gmail.com"
            onChange={(event) => setDraft({ ...draft, alertEmail: event.target.value })}
          />
          <span className="mt-1 block font-normal text-slate-500">Name, email, plan, amount, method and time of every payment.</span>
        </label>

        <div className="rounded-xl border border-slate-300 p-4">
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-500"
              checked={draft.exitOffer.enabled}
              onChange={(event) => setDraft({ ...draft, exitOffer: { ...draft.exitOffer, enabled: event.target.checked } })}
            />
            Exit offer on the pricing page
          </label>
          <p className="mt-1 text-xs text-slate-500">Shown once to someone leaving the pricing page without paying. Each account can use it once.</p>
          <div className="mt-3 grid grid-cols-[6rem_1fr] gap-2">
            <label className={label}>
              % off
              <input
                type="number"
                min={5}
                max={50}
                className={`${input} mt-1`}
                value={draft.exitOffer.percentOff}
                onChange={(event) => setDraft({ ...draft, exitOffer: { ...draft.exitOffer, percentOff: Number(event.target.value) } })}
              />
            </label>
            <label className={label}>
              Headline ({"{percent}"} = the number)
              <input
                className={`${input} mt-1`}
                value={draft.exitOffer.headline}
                maxLength={120}
                onChange={(event) => setDraft({ ...draft, exitOffer: { ...draft.exitOffer, headline: event.target.value } })}
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-300 p-4">
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-500"
              checked={draft.referrals.enabled}
              onChange={(event) => setDraft({ ...draft, referrals: { enabled: event.target.checked } })}
            />
            Friend invites
          </label>
          <p className="mt-1 text-xs text-slate-500">
            Every two friends who sign up with a student&apos;s link and practise a little give that student a free week of the paid plan (up to five weeks).
          </p>
        </div>
      </fieldset>

      {message && (
        <div className="mt-4">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
      {canWrite && (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => {
              setDraft(query.data ?? null);
              setMessage(null);
            }}
          >
            Discard
          </Button>
          <Button disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save payments"}
          </Button>
        </div>
      )}
    </Card>
  );
}
