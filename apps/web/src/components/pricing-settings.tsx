"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CURRENCIES, type PricingContent, type PricingPlan } from "@satsharks/types";
import { api } from "@/lib/api";
import { PRICING_QUERY_KEY } from "@/lib/pricing";
import { Button, Card, Notice, Spinner } from "./ui";

const QUERY_KEY = ["admin", "settings", "pricing"] as const;
const input = "h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-normal outline-none focus:border-brand-500";
const label = "block text-xs font-bold text-slate-600";

// Highlights are edited one per line.
type PlanDraft = Omit<PricingPlan, "highlights"> & { highlights: string };
type Draft = Omit<PricingContent, "plans"> & { plans: PlanDraft[] };

const toDraft = (pricing: PricingContent): Draft => ({ ...pricing, plans: pricing.plans.map((plan) => ({ ...plan, highlights: plan.highlights.join("\n") })) });
const fromDraft = (draft: Draft): PricingContent => ({
  ...draft,
  plans: draft.plans.map((plan) => ({ ...plan, highlights: plan.highlights.split("\n").map((line) => line.trim()).filter(Boolean) })),
});

// The plans, prices and notes on the public pricing page. The four plans themselves are fixed
// (accounts record which one they are on); everything written about them can be changed here.
export function PricingSettingsCard({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const pricing = useQuery({ queryKey: QUERY_KEY, queryFn: () => api<PricingContent>("/api/admin/settings/pricing") });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    if (pricing.data && draft === null) setDraft(toDraft(pricing.data));
  }, [pricing.data, draft]);

  if (pricing.isLoading || (!draft && !pricing.error)) {
    return (
      <Card>
        <Spinner label="Loading pricing" />
      </Card>
    );
  }
  if (pricing.error || !draft) return <Notice tone="error">{pricing.error?.message ?? "Could not load pricing"}</Notice>;

  const setPlan = (index: number, patch: Partial<PlanDraft>) => setDraft({ ...draft, plans: draft.plans.map((plan, at) => (at === index ? { ...plan, ...patch } : plan)) });
  const setRow = (index: number, patch: Partial<Draft["comparison"][number]>) =>
    setDraft({ ...draft, comparison: draft.comparison.map((row, at) => (at === index ? { ...row, ...patch } : row)) });

  async function save() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await api<PricingContent>("/api/admin/settings/pricing", { method: "PUT", body: fromDraft(draft) });
      queryClient.setQueryData(QUERY_KEY, saved);
      queryClient.setQueryData(PRICING_QUERY_KEY, saved);
      setDraft(toDraft(saved));
      setMessage({ tone: "info", text: "Saved. The pricing page shows the new plans now." });
    } catch (caught) {
      setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">Pricing</h2>
        <a href="/pricing" target="_blank" rel="noreferrer" className="text-sm font-bold text-brand-500 hover:underline">
          View the pricing page →
        </a>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        What students see on the pricing page. The four plans are fixed; their names, prices and points can be changed. Write prices as they should appear, e.g.
        &quot;PKR 1,500&quot; or &quot;$12.99&quot;.
      </p>

      <fieldset disabled={!canWrite || saving} className="mt-4 space-y-5">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {draft.plans.map((plan, index) => (
            <div key={plan.id} className={`space-y-2.5 rounded-xl border p-3 ${plan.popular ? "border-brand-500 ring-1 ring-brand-500" : "border-slate-300"}`}>
              <label className={label}>
                Plan name
                <input className={`${input} mt-1`} value={plan.name} onChange={(event) => setPlan(index, { name: event.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CURRENCIES.map((currency) => (
                  <label key={currency} className={label}>
                    Price ({currency})
                    <input className={`${input} mt-1`} value={plan.price[currency]} onChange={(event) => setPlan(index, { price: { ...plan.price, [currency]: event.target.value } })} />
                  </label>
                ))}
              </div>
              <label className={label}>
                Period
                <input className={`${input} mt-1`} value={plan.period} placeholder="per month" onChange={(event) => setPlan(index, { period: event.target.value })} />
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={plan.saving !== null} onChange={(event) => setPlan(index, { saving: event.target.checked ? { PKR: "Save 0%", USD: "Save 0%" } : null })} />
                Show a saving badge
              </label>
              {plan.saving && (
                <div className="grid grid-cols-2 gap-2">
                  {CURRENCIES.map((currency) => (
                    <label key={currency} className={label}>
                      Badge ({currency})
                      <input className={`${input} mt-1`} value={plan.saving![currency]} onChange={(event) => setPlan(index, { saving: { ...plan.saving!, [currency]: event.target.value } })} />
                    </label>
                  ))}
                </div>
              )}
              <label className={label}>
                Points (one per line)
                <textarea className={`${input} mt-1 h-24 py-1.5`} value={plan.highlights} onChange={(event) => setPlan(index, { highlights: event.target.value })} />
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input
                  type="radio"
                  name="popular-plan"
                  className="h-4 w-4 accent-brand-500"
                  checked={plan.popular}
                  onChange={() => setDraft({ ...draft, plans: draft.plans.map((entry, at) => ({ ...entry, popular: at === index })) })}
                />
                Most popular
              </label>
            </div>
          ))}
        </div>
        {draft.plans.some((plan) => plan.popular) && (
          <button type="button" className="cursor-pointer text-xs font-bold text-brand-500 hover:underline" onClick={() => setDraft({ ...draft, plans: draft.plans.map((plan) => ({ ...plan, popular: false })) })}>
            Show no plan as most popular
          </button>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <label className={label}>
            Line under the plans
            <input className={`${input} mt-1`} value={draft.tagline} onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} />
          </label>
          <label className={label}>
            Refund policy
            <input className={`${input} mt-1`} value={draft.refundPolicy} onChange={(event) => setDraft({ ...draft, refundPolicy: event.target.value })} />
          </label>
          <label className={label}>
            Line under the comparison
            <input className={`${input} mt-1`} value={draft.schoolsNote} onChange={(event) => setDraft({ ...draft, schoolsNote: event.target.value })} />
          </label>
        </div>

        <div>
          <h3 className="text-sm font-bold">Free vs paid comparison</h3>
          <div className="mt-2 space-y-2">
            <div className="hidden grid-cols-[2fr_1fr_1fr_auto] gap-2 text-xs font-bold text-slate-600 md:grid">
              <span>Feature</span>
              <span>Free</span>
              <span>Paid</span>
              <span className="w-16" />
            </div>
            {draft.comparison.map((row, index) => (
              <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-2 md:grid-cols-[2fr_1fr_1fr_auto] md:border-0 md:p-0">
                <input className={input} aria-label="Feature" value={row.feature} onChange={(event) => setRow(index, { feature: event.target.value })} />
                <input className={input} aria-label="Free" value={row.free} onChange={(event) => setRow(index, { free: event.target.value })} />
                <input className={input} aria-label="Paid" value={row.paid} onChange={(event) => setRow(index, { paid: event.target.value })} />
                <Button size="sm" variant="outline" className="w-16" onClick={() => setDraft({ ...draft, comparison: draft.comparison.filter((_, at) => at !== index) })}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <Button size="sm" variant="outline" className="mt-2" disabled={draft.comparison.length >= 20} onClick={() => setDraft({ ...draft, comparison: [...draft.comparison, { feature: "", free: "", paid: "" }] })}>
            Add a row
          </Button>
        </div>
      </fieldset>

      {message && (
        <div className="mt-3">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
      {canWrite ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save pricing"}
          </Button>
          <Button variant="outline" disabled={saving} onClick={() => pricing.data && setDraft(toDraft(pricing.data))}>
            Undo changes
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">Your account can view these settings but not change them.</p>
      )}
    </Card>
  );
}
