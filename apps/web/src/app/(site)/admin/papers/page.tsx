"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SECTION_LABELS, type PaperStatus, type PaperSummary } from "@satsharks/types";
import { RequireUser } from "@/components/require-user";
import { Badge, Button, Card, Notice, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

const STATUS_TONE = { draft: "amber", published: "green", hidden: "neutral" } as const;

function Papers({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
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

  return (
    <>
      <PageHeader title="Papers" subtitle="Publish a paper to show it to students, or hide it. Hiding keeps every past attempt." />
      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 px-5 py-4">
          <h2 className="font-bold">All papers ({list.length})</h2>
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

        {/* Phones: one card per paper. */}
        <ul className="divide-y divide-slate-200 md:hidden">
          {list.map((paper) => (
            <li key={paper.id} className="flex flex-col gap-2 px-4 py-3">
              <Link href={`/admin/papers/${paper.id}`} className="font-bold text-brand-500 hover:underline">
                {paper.title}
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <Badge tone={STATUS_TONE[paper.status]}>{paper.status}</Badge>
                <span>{paper.sections.map((section) => SECTION_LABELS[section]).join(", ")}</span>
                <span>· {paper.questionCount} questions</span>
                {canWrite && (
                  <span className="ml-auto">
                    {paper.status === "published" ? (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("hidden", paper.id)}>
                        Hide
                      </Button>
                    ) : (
                      <Button size="sm" disabled={busy} onClick={() => setStatus("published", paper.id)}>
                        Publish
                      </Button>
                    )}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Tablets and up: a table. */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
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

export default function AdminPapersPage() {
  return <RequireUser permission="papers:read">{(user) => <Papers canWrite={user.permissions.includes("papers:write")} />}</RequireUser>;
}
