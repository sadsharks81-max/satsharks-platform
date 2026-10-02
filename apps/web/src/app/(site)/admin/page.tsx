"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SECTION_LABELS, type AdminStats, type PaperStatus, type PaperSummary } from "@satsharks/types";
import { RequireUser } from "@/components/require-user";
import { Badge, Button, Card, Notice, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

const STATUS_TONE = { draft: "amber", published: "green", hidden: "neutral" } as const;

function Dashboard({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => api<AdminStats>("/api/admin/stats") });
  const papers = useQuery({ queryKey: ["admin", "papers"], queryFn: () => api<{ papers: PaperSummary[] }>("/api/admin/papers") });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bulk changes affect what every student sees, so they are confirmed first.
  const [confirm, setConfirm] = useState<PaperStatus | null>(null);

  async function setStatus(status: PaperStatus, id?: string) {
    setBusy(true);
    setError(null);
    try {
      if (id) await api(`/api/admin/papers/${id}/status`, { method: "PATCH", body: { status } });
      else await api("/api/admin/papers/status", { method: "POST", body: { status } });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin"] }), queryClient.invalidateQueries({ queryKey: ["practice", "catalog"] })]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not change the status");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const list = papers.data?.papers ?? [];
  const s = stats.data;

  return (
    <>
      <PageHeader title="Admin Dashboard" subtitle="Papers, questions and users." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Users", value: s?.users },
          { label: "Papers published", value: s ? `${s.papers.published} of ${s.papers.draft + s.papers.published + s.papers.hidden}` : undefined },
          { label: "Questions", value: s ? (s.questions.draft + s.questions.published + s.questions.hidden).toLocaleString() : undefined },
          { label: "Drills started", value: s?.attempts },
        ].map((stat) => (
          <Card key={stat.label}>
            <div className="text-2xl font-bold">{stat.value ?? "…"}</div>
            <div className="mt-1 text-sm font-medium text-slate-600">{stat.label}</div>
          </Card>
        ))}
      </div>
      {s && (
        <p className="mt-2 text-sm text-slate-600">
          {s.questionsBySection.math.toLocaleString()} Math · {s.questionsBySection.reading_writing.toLocaleString()} Reading &amp; Writing · {s.questions.published.toLocaleString()} visible to students
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-bold">Questions</h2>
          <p className="mt-1 text-sm text-slate-600">Browse the question bank by section, topic, skill and difficulty. Search, edit and delete.</p>
          <Link href="/admin/questions" className="mt-3 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">
            Open question bank
          </Link>
        </Card>
        <Card>
          <h2 className="font-bold">Users</h2>
          <p className="mt-1 text-sm text-slate-600">User management arrives with the admin portal (Phase 4).</p>
        </Card>
      </div>

      <Card className="mt-6 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 px-5 py-4">
          <h2 className="font-bold">Papers ({list.length})</h2>
          {canWrite && (
            <div className="flex gap-2">
              <Button size="sm" disabled={busy || list.length === 0} onClick={() => setConfirm("published")}>
                Publish all
              </Button>
              <Button size="sm" variant="outline" disabled={busy || list.length === 0} onClick={() => setConfirm("hidden")}>
                Hide all
              </Button>
            </div>
          )}
        </div>
        {confirm && (
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-900 bg-amber-50 px-5 py-3 text-sm">
            <span className="font-medium">
              {confirm === "published" ? `Make all ${list.length} papers visible to every student?` : `Hide all ${list.length} papers from students? Their past attempts are kept.`}
            </span>
            <Button size="sm" disabled={busy} onClick={() => setStatus(confirm)}>
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <tbody className="divide-y divide-slate-200">
              {list.map((paper) => (
                <tr key={paper.id}>
                  <td className="px-5 py-3">
                    <Link href={`/admin/papers/${paper.id}`} className="font-bold text-brand-500 hover:underline">
                      {paper.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{paper.sections.map((section) => SECTION_LABELS[section]).join(", ")}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{paper.questionCount} questions</td>
                  <td className="px-3 py-3">
                    <Badge tone={STATUS_TONE[paper.status]}>{paper.status}</Badge>
                  </td>
                  {canWrite && (
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {paper.status === "published" ? (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("hidden", paper.id)}>
                          Hide
                        </Button>
                      ) : (
                        <Button size="sm" disabled={busy} onClick={() => setStatus("published", paper.id)}>
                          Publish
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export default function AdminPage() {
  return <RequireUser permission="admin:access">{(user) => <Dashboard canWrite={user.permissions.includes("papers:write")} />}</RequireUser>;
}
