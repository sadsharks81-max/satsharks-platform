"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SatDatesContent, SatTestDate } from "@satsharks/types";
import { RequireUser } from "@/components/require-user";
import { Button, Card, Notice, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDay, SAT_DATES_QUERY_KEY } from "@/lib/sat-dates";

const QUERY_KEY = ["admin", "settings", "sat-dates"] as const;
const input = "h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-normal outline-none focus:border-brand-500";
const label = "block text-xs font-bold text-slate-600";
const EMPTY: SatTestDate = { date: "", registrationDeadline: "", lateDeadline: null, note: "" };

function SatDatesEditor({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const stored = useQuery({ queryKey: QUERY_KEY, queryFn: () => api<SatDatesContent>("/api/admin/settings/sat-dates") });
  const [draft, setDraft] = useState<SatTestDate[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    if (stored.data && draft === null) setDraft(stored.data.dates);
  }, [stored.data, draft]);

  if (stored.isLoading || (!draft && !stored.error)) {
    return (
      <Card>
        <Spinner label="Loading dates" />
      </Card>
    );
  }
  if (stored.error || !draft) return <Notice tone="error">{stored.error?.message ?? "Could not load the dates"}</Notice>;

  const setRow = (index: number, patch: Partial<SatTestDate>) => setDraft(draft.map((row, at) => (at === index ? { ...row, ...patch } : row)));

  async function save() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await api<SatDatesContent>("/api/admin/settings/sat-dates", { method: "PUT", body: { dates: draft.map((row) => ({ ...row, note: row.note.trim() })) } });
      queryClient.setQueryData(QUERY_KEY, saved);
      queryClient.setQueryData(SAT_DATES_QUERY_KEY, saved);
      setDraft(saved.dates);
      setMessage({ tone: "info", text: "Saved. The SAT dates page and the dashboard countdown use these dates now." });
    } catch (caught) {
      setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">Test dates</h2>
        <a href="/sat-dates" target="_blank" rel="noreferrer" className="text-sm font-bold text-brand-500 hover:underline">
          View the SAT dates page →
        </a>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Copy them from College Board&apos;s dates page. Past dates are hidden from students on their own, so they can stay here. The countdown on the student dashboard
        always shows the next date.
      </p>

      <fieldset disabled={!canWrite || saving} className="mt-4 space-y-2">
        <div className="hidden grid-cols-[1fr_1fr_1fr_1.5fr_auto] gap-2 text-xs font-bold text-slate-600 lg:grid">
          <span>Test date</span>
          <span>Registration deadline</span>
          <span>Late registration &amp; changes</span>
          <span>Note (optional)</span>
          <span className="w-16" />
        </div>
        {draft.map((row, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.5fr_auto] lg:border-0 lg:p-0">
            <label className={label}>
              <span className="lg:sr-only">Test date</span>
              <input type="date" required className={`${input} mt-1 lg:mt-0`} value={row.date} onChange={(event) => setRow(index, { date: event.target.value })} />
              {/^\d{4}-\d{2}-\d{2}$/.test(row.date) && <span className="mt-0.5 block font-normal text-slate-500">{formatDay(row.date)}</span>}
            </label>
            <label className={label}>
              <span className="lg:sr-only">Registration deadline</span>
              <input type="date" required className={`${input} mt-1 lg:mt-0`} value={row.registrationDeadline} onChange={(event) => setRow(index, { registrationDeadline: event.target.value })} />
            </label>
            <label className={label}>
              <span className="lg:sr-only">Late registration &amp; changes</span>
              <input type="date" className={`${input} mt-1 lg:mt-0`} value={row.lateDeadline ?? ""} onChange={(event) => setRow(index, { lateDeadline: event.target.value || null })} />
            </label>
            <label className={label}>
              <span className="lg:sr-only">Note (optional)</span>
              <input className={`${input} mt-1 lg:mt-0`} maxLength={160} placeholder="e.g. Scores out Nov 20" value={row.note} onChange={(event) => setRow(index, { note: event.target.value })} />
            </label>
            <Button size="sm" variant="outline" className="h-9 w-16 self-start" onClick={() => setDraft(draft.filter((_, at) => at !== index))}>
              Remove
            </Button>
          </div>
        ))}
        {draft.length === 0 && <p className="text-sm text-slate-600">No dates. Students see &quot;not announced yet&quot; and no countdown.</p>}
        <Button size="sm" variant="outline" disabled={draft.length >= 40} onClick={() => setDraft([...draft, EMPTY])}>
          Add a date
        </Button>
      </fieldset>

      {message && (
        <div className="mt-3">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
      {canWrite ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save dates"}
          </Button>
          <Button variant="outline" disabled={saving} onClick={() => stored.data && setDraft(stored.data.dates)}>
            Undo changes
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">Your account can view these dates but not change them.</p>
      )}
    </Card>
  );
}

export default function AdminSatDatesPage() {
  return (
    <RequireUser permission="admin:access">
      {(user) => (
        <>
          <PageHeader title="SAT dates" subtitle="The test dates and deadlines on the public SAT dates page and the countdown on the student dashboard." />
          <SatDatesEditor canWrite={user.permissions.includes("papers:write")} />
        </>
      )}
    </RequireUser>
  );
}
