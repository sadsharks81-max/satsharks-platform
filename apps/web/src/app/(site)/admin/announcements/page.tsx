"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_AUDIENCES,
  type Announcement,
  type AnnouncementAudience,
  type AnnouncementTone,
} from "@satsharks/types";
import { AnnouncementCard } from "@/components/announcements";
import { RequireUser } from "@/components/require-user";
import { Badge, Button, Card, Notice, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

const QUERY_KEY = ["admin", "announcements"];
const input = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

interface Form {
  title: string;
  message: string;
  audience: AnnouncementAudience;
  tone: AnnouncementTone;
  active: boolean;
  // datetime-local value in the admin's own time zone; "" = no end.
  endsAt: string;
}

const EMPTY: Form = { title: "", message: "", audience: "all", tone: "info", active: true, endsAt: "" };

// ISO → the "YYYY-MM-DDTHH:mm" a datetime-local input shows, in local time.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

const toBody = (form: Form) => ({ ...form, title: form.title.trim(), message: form.message.trim(), endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null });

function status(announcement: Announcement): { label: string; tone: "green" | "neutral" | "amber" } {
  if (!announcement.active) return { label: "Off", tone: "neutral" };
  if (announcement.endsAt && new Date(announcement.endsAt).getTime() <= Date.now()) return { label: "Ended", tone: "amber" };
  return { label: "Showing", tone: "green" };
}

function Announcements({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: QUERY_KEY, queryFn: () => api<{ announcements: Announcement[] }>("/api/admin/announcements") });
  const [form, setForm] = useState<Form>(EMPTY);
  // null = writing a new one.
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await refresh();
      setMessage({ tone: "info", text: done });
      return true;
    } catch (caught) {
      setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "Something went wrong" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const ok = await run(
      () => (editing ? api(`/api/admin/announcements/${editing}`, { method: "PUT", body: toBody(form) }) : api("/api/admin/announcements", { method: "POST", body: toBody(form) })),
      editing ? "Announcement updated." : form.active ? "Announcement published." : "Announcement saved (off).",
    );
    if (ok) {
      setForm(EMPTY);
      setEditing(null);
    }
  }

  function edit(announcement: Announcement) {
    setEditing(announcement.id);
    setForm({ ...announcement, endsAt: toLocalInput(announcement.endsAt) });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const toggle = (announcement: Announcement) =>
    run(
      () => {
        const { title, message, audience, tone, endsAt } = announcement;
        return api(`/api/admin/announcements/${announcement.id}`, { method: "PUT", body: { title, message, audience, tone, endsAt, active: !announcement.active } });
      },
      announcement.active ? "Turned off." : "Turned on.",
    );

  const preview: Announcement = { id: "preview", ...toBody(form), title: form.title || "Title", message: form.message || "Your message", createdAt: "", updatedAt: "" };
  const announcements = list.data?.announcements ?? [];

  return (
    <div className="grid gap-4">
      {canWrite && (
        <Card>
          <h2 className="font-bold">{editing ? "Edit announcement" : "New announcement"}</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3">
              <label className="block text-sm font-bold">
                Title
                <input value={form.title} maxLength={120} onChange={(event) => set("title", event.target.value)} placeholder="e.g. New December SAT added" className={`${input} mt-1`} />
              </label>
              <label className="block text-sm font-bold">
                Message
                <textarea
                  value={form.message}
                  maxLength={2000}
                  rows={4}
                  onChange={(event) => set("message", event.target.value)}
                  placeholder="What students should know"
                  className={`${input} mt-1 h-auto py-2`}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-sm font-bold">
                  Show to
                  <select value={form.audience} onChange={(event) => set("audience", event.target.value as AnnouncementAudience)} className={`${input} mt-1`}>
                    {ANNOUNCEMENT_AUDIENCES.map((audience) => (
                      <option key={audience} value={audience}>
                        {ANNOUNCEMENT_AUDIENCE_LABELS[audience]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-bold">
                  Style
                  <select value={form.tone} onChange={(event) => set("tone", event.target.value as AnnouncementTone)} className={`${input} mt-1`}>
                    <option value="info">Information</option>
                    <option value="important">Important</option>
                  </select>
                </label>
                <label className="block text-sm font-bold">
                  Show until <span className="font-normal text-slate-500">(optional)</span>
                  <input type="datetime-local" value={form.endsAt} onChange={(event) => set("endsAt", event.target.value)} className={`${input} mt-1`} />
                </label>
              </div>
              <label className="flex h-10 cursor-pointer items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold">
                Show to students now
                <input type="checkbox" checked={form.active} onChange={(event) => set("active", event.target.checked)} className="h-4 w-4 accent-brand-500" />
              </label>
            </div>
            <div>
              <p className="mb-1 text-sm font-bold">Preview</p>
              <AnnouncementCard announcement={preview} />
              <p className="mt-2 text-xs text-slate-600">
                Shown at the top of every page to signed-in students in the chosen group. A student can dismiss it; editing it shows it again.
              </p>
            </div>
          </div>
          {message && (
            <div className="mt-3">
              <Notice tone={message.tone}>{message.text}</Notice>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={busy || !form.title.trim() || !form.message.trim()} onClick={save}>
              {busy ? "Saving…" : editing ? "Save changes" : form.active ? "Publish" : "Save as off"}
            </Button>
            {editing && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setEditing(null);
                  setForm(EMPTY);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card className="p-0">
        <h2 className="border-b border-slate-900 px-5 py-4 font-bold">All announcements ({announcements.length})</h2>
        {list.isLoading && (
          <div className="px-5">
            <Spinner label="Loading announcements" />
          </div>
        )}
        {list.error && (
          <div className="p-4">
            <Notice tone="error">{list.error.message}</Notice>
          </div>
        )}
        {list.data && announcements.length === 0 && <p className="px-5 py-6 text-sm text-slate-600">No announcements yet.</p>}
        <ul className="divide-y divide-slate-200">
          {announcements.map((announcement) => {
            const state = status(announcement);
            return (
              <li key={announcement.id} className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{announcement.title}</p>
                    <Badge tone={state.tone}>{state.label}</Badge>
                    <Badge tone="brand">{ANNOUNCEMENT_AUDIENCE_LABELS[announcement.audience]}</Badge>
                    {announcement.tone === "important" && <Badge tone="amber">Important</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 whitespace-pre-line break-words text-sm text-slate-700">{announcement.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(announcement.createdAt).toLocaleString()}
                    {announcement.endsAt && ` · until ${new Date(announcement.endsAt).toLocaleString()}`}
                  </p>
                </div>
                {canWrite && (
                  <div className="flex flex-none flex-wrap gap-2">
                    {confirmDelete === announcement.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={busy}
                          onClick={async () => {
                            await run(() => api(`/api/admin/announcements/${announcement.id}`, { method: "DELETE" }), "Announcement deleted.");
                            setConfirmDelete(null);
                            if (editing === announcement.id) {
                              setEditing(null);
                              setForm(EMPTY);
                            }
                          }}
                        >
                          Yes, delete
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmDelete(null)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => edit(announcement)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => toggle(announcement)}>
                          {announcement.active ? "Turn off" : "Turn on"}
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmDelete(announcement.id)}>
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

export default function AdminAnnouncementsPage() {
  return (
    <RequireUser permission="admin:access">
      {(user) => (
        <>
          <PageHeader title="Announcements" subtitle="Messages shown at the top of the site to all students, or only free or paid accounts." />
          <Announcements canWrite={user.permissions.includes("papers:write")} />
        </>
      )}
    </RequireUser>
  );
}
