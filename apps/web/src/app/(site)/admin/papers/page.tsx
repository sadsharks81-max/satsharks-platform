"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SECTION_LABELS, type PaperStatus, type PaperSummary } from "@satsharks/types";
import { RequireUser } from "@/components/require-user";
import { Badge, Button, Card, Modal, Notice, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

const STATUS_TONE = { draft: "amber", published: "green", hidden: "neutral" } as const;

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

// <input type="datetime-local"> works in local time without a zone: "2026-10-26T09:00".
function localInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Publish a paper by itself at a chosen moment (proposal 4.2: "one new paper every Monday").
function ScheduleDialog({ paper, onClose, onSaved }: { paper: PaperSummary; onClose: () => void; onSaved: () => Promise<void> }) {
  const tomorrow = new Date(Date.now() + 86_400_000);
  tomorrow.setHours(9, 0, 0, 0);
  const [value, setValue] = useState(localInputValue(paper.publishAt ? new Date(paper.publishAt) : tomorrow));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(at: string | null) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/papers/${paper.id}/schedule`, { method: "PUT", body: { at } });
      await onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the schedule");
      setBusy(false);
    }
  }

  return (
    <Modal title="Schedule publishing" onClose={() => !busy && onClose()}>
      <p className="text-sm text-slate-700">
        <b>{paper.title}</b> will be published by itself at this time (your computer&apos;s time zone) and appear to students straight away.
      </p>
      <input
        type="datetime-local"
        aria-label="Publish at"
        className="mt-4 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
        value={value}
        min={localInputValue(new Date())}
        onChange={(event) => setValue(event.target.value)}
      />
      {error && (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {paper.publishAt && (
          <Button variant="outline" disabled={busy} onClick={() => save(null)}>
            Remove schedule
          </Button>
        )}
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={busy || !value} onClick={() => save(new Date(value).toISOString())}>
          {busy ? "Saving…" : "Schedule"}
        </Button>
      </div>
    </Modal>
  );
}

function Papers({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const papers = useQuery({ queryKey: ["admin", "papers"], queryFn: () => api<{ papers: PaperSummary[] }>("/api/admin/papers") });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduling, setScheduling] = useState<PaperSummary | null>(null);
  // Bulk changes affect what every student sees, so they are confirmed first.
  const [confirm, setConfirm] = useState<{ status: PaperStatus; ids?: string[] } | null>(null);

  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["admin"] }), queryClient.invalidateQueries({ queryKey: ["practice", "catalog"] })]).then(() => undefined);

  async function setStatus(status: PaperStatus, ids?: string[]) {
    setBusy(true);
    setError(null);
    try {
      if (ids && ids.length === 1) await api(`/api/admin/papers/${ids[0]}/status`, { method: "PATCH", body: { status } });
      else await api("/api/admin/papers/status", { method: "POST", body: ids ? { status, ids } : { status } });
      setSelected(new Set());
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not change the status");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const list = papers.data?.papers ?? [];
  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const allSelected = list.length > 0 && selected.size === list.length;
  const count = confirm?.ids ? confirm.ids.length : list.length;

  const actions = (paper: PaperSummary) =>
    canWrite && (
      <span className="flex flex-wrap justify-end gap-2">
        {paper.status !== "published" && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setScheduling(paper)}>
            {paper.publishAt ? "Change schedule" : "Schedule"}
          </Button>
        )}
        {paper.status === "published" ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("hidden", [paper.id])}>
            Hide
          </Button>
        ) : (
          <Button size="sm" disabled={busy} onClick={() => setStatus("published", [paper.id])}>
            Publish
          </Button>
        )}
      </span>
    );

  const status = (paper: PaperSummary) => (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={STATUS_TONE[paper.status]}>{paper.status}</Badge>
      {paper.publishAt && <span className="text-xs font-bold text-brand-600">Publishes {when(paper.publishAt)}</span>}
    </span>
  );

  return (
    <>
      <PageHeader
        title="Papers"
        subtitle="Publish a paper to show it to students, hide it, or schedule it to appear by itself. Hiding keeps every past attempt. Free, paid-only or invite-code access, pins and labels are set on the Access page."
      />
      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 px-5 py-4">
          <h2 className="font-bold">
            All papers ({list.length}){selected.size > 0 && <span className="font-normal text-slate-600"> · {selected.size} selected</span>}
          </h2>
          {canWrite && (
            <div className="flex flex-wrap gap-2">
              {selected.size > 0 ? (
                <>
                  <Button size="sm" disabled={busy} onClick={() => setConfirm({ status: "published", ids: [...selected] })}>
                    Publish selected
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm({ status: "hidden", ids: [...selected] })}>
                    Hide selected
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" disabled={busy || list.length === 0} onClick={() => setConfirm({ status: "published" })}>
                    Publish all
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy || list.length === 0} onClick={() => setConfirm({ status: "hidden" })}>
                    Hide all
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        {confirm && (
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-900 bg-amber-50 px-5 py-3 text-sm">
            <span className="font-medium">
              {confirm.status === "published"
                ? `Make ${confirm.ids ? "the" : "all"} ${count} paper${count === 1 ? "" : "s"} visible to every student?`
                : `Hide ${confirm.ids ? "the" : "all"} ${count} paper${count === 1 ? "" : "s"} from students? Their past attempts are kept.`}
            </span>
            <Button size="sm" disabled={busy} onClick={() => setStatus(confirm.status, confirm.ids)}>
              {busy ? "Working…" : "Yes, continue"}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
          </div>
        )}
        {error && (
          <div className="p-4">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        {papers.isLoading && (
          <div className="px-5">
            <Spinner label="Loading papers" />
          </div>
        )}
        {papers.error && (
          <div className="p-4">
            <Notice tone="error">{papers.error.message}</Notice>
          </div>
        )}
        {papers.data && list.length === 0 && <p className="px-5 py-6 text-sm text-slate-600">No papers yet. Import one with the collect or scrape commands.</p>}

        {/* Phones: one card per paper. */}
        <ul className="divide-y divide-slate-200 md:hidden">
          {list.map((paper) => (
            <li key={paper.id} className="flex gap-3 px-4 py-3">
              {canWrite && <input type="checkbox" aria-label={`Select ${paper.title}`} className="mt-1 h-4 w-4 accent-brand-500" checked={selected.has(paper.id)} onChange={() => toggle(paper.id)} />}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Link href={`/admin/papers/${paper.id}`} className="font-bold text-brand-500 hover:underline">
                  {paper.title}
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  {status(paper)}
                  <span>{paper.sections.map((section) => SECTION_LABELS[section]).join(", ")}</span>
                  <span>· {paper.questionCount} questions</span>
                </div>
                {actions(paper)}
              </div>
            </li>
          ))}
        </ul>

        {/* Tablets and up: a table. */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            {canWrite && list.length > 0 && (
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-10 px-5 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all papers"
                      className="h-4 w-4 accent-brand-500"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(list.map((paper) => paper.id)))}
                    />
                  </th>
                  <th className="py-2" colSpan={5}>
                    Select papers to publish or hide together
                  </th>
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-200">
              {list.map((paper) => (
                <tr key={paper.id}>
                  {canWrite && (
                    <td className="w-10 px-5 py-3">
                      <input type="checkbox" aria-label={`Select ${paper.title}`} className="h-4 w-4 accent-brand-500" checked={selected.has(paper.id)} onChange={() => toggle(paper.id)} />
                    </td>
                  )}
                  <td className={`${canWrite ? "pr-3" : "px-5"} py-3`}>
                    <Link href={`/admin/papers/${paper.id}`} className="font-bold text-brand-500 hover:underline">
                      {paper.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{paper.sections.map((section) => SECTION_LABELS[section]).join(", ")}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{paper.questionCount} questions</td>
                  <td className="px-3 py-3">{status(paper)}</td>
                  {canWrite && <td className="px-5 py-3 text-right whitespace-nowrap">{actions(paper)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {scheduling && <ScheduleDialog paper={scheduling} onClose={() => setScheduling(null)} onSaved={refresh} />}
    </>
  );
}

export default function AdminPapersPage() {
  return <RequireUser permission="papers:read">{(user) => <Papers canWrite={user.permissions.includes("papers:write")} />}</RequireUser>;
}
