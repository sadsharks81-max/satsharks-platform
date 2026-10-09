"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ACCESS_FEATURE_LABELS,
  ACCESS_FEATURES,
  contentAccessLevel,
  type AccessFeature,
  type AccessItem,
  type AccessLevel,
  type AccessSettings,
  type AdminAccess,
} from "@satsharks/types";
import { RequireUser } from "@/components/require-user";
import { Badge, Button, Card, Notice, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

const QUERY_KEY = ["admin", "settings", "access"];

interface Draft {
  features: Record<AccessFeature, AccessLevel>;
  // Every listed exam and test, set explicitly.
  levels: Record<string, AccessLevel>;
  newContent: AccessLevel;
}

function toDraft(data: AdminAccess): Draft {
  return {
    features: { ...data.settings.features },
    levels: Object.fromEntries(data.items.map((item) => [item.key, contentAccessLevel(data.settings, item.key)])),
    newContent: data.settings.newContent,
  };
}

// Free (every account) or paid only.
function LevelSwitch({ value, onChange, disabled, label }: { value: AccessLevel; onChange: (value: AccessLevel) => void; disabled: boolean; label: string }) {
  const option = (level: AccessLevel, text: string) => (
    <button
      type="button"
      aria-pressed={value === level}
      disabled={disabled}
      onClick={() => onChange(level)}
      className={`min-h-9 cursor-pointer rounded-md px-3 text-xs font-bold disabled:cursor-not-allowed ${
        value === level ? (level === "free" ? "bg-green-600 text-white" : "bg-brand-500 text-white") : "text-slate-600 hover:bg-slate-100 disabled:hover:bg-transparent"
      }`}
    >
      {text}
    </button>
  );
  return (
    <div role="group" aria-label={label} className="inline-flex flex-none gap-1 rounded-lg border border-slate-900 bg-white p-1">
      {option("free", "Free")}
      {option("paid", "Paid only")}
    </div>
  );
}

function ItemList({
  title,
  description,
  items,
  levels,
  canWrite,
  onChange,
}: {
  title: string;
  description: string;
  items: AccessItem[];
  levels: Record<string, AccessLevel>;
  canWrite: boolean;
  onChange: (keys: string[], level: AccessLevel) => void;
}) {
  const [search, setSearch] = useState("");
  const shown = items.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()));
  const free = items.filter((item) => levels[item.key] === "free").length;

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 px-5 py-4">
        <div>
          <h2 className="font-bold">
            {title} <span className="font-normal text-slate-600">({free} of {items.length} free)</span>
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">{description}</p>
        </div>
        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              aria-label={`Search ${title.toLowerCase()}`}
              className="h-9 w-40 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-500"
            />
            {canWrite && (
              <>
                <Button size="sm" variant="outline" disabled={shown.length === 0} onClick={() => onChange(shown.map((item) => item.key), "free")}>
                  {search ? "Shown" : "All"} free
                </Button>
                <Button size="sm" variant="outline" disabled={shown.length === 0} onClick={() => onChange(shown.map((item) => item.key), "paid")}>
                  {search ? "Shown" : "All"} paid only
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      {items.length === 0 && <p className="px-5 py-6 text-sm text-slate-600">Nothing published yet.</p>}
      {items.length > 0 && shown.length === 0 && <p className="px-5 py-6 text-sm text-slate-600">Nothing matches &ldquo;{search}&rdquo;.</p>}
      <ul className="divide-y divide-slate-200">
        {shown.map((item) => (
          <li key={item.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
            <div className="min-w-0">
              <p className="font-bold">{item.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                {item.date && <span>{item.date}</span>}
                {item.key.startsWith("upload:") && item.kind === "exam" && <span>Uploaded exam</span>}
                {!item.active && <Badge tone="amber">Not active</Badge>}
              </div>
            </div>
            <LevelSwitch label={`Access to ${item.name}`} value={levels[item.key] ?? "free"} disabled={!canWrite} onChange={(level) => onChange([item.key], level)} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Access({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: () => api<AdminAccess>("/api/admin/settings/access") });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    if (query.data && draft === null) setDraft(toDraft(query.data));
  }, [query.data, draft]);

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const exams = items.filter((item) => item.kind === "exam");
  const practice = items.filter((item) => item.kind === "practice");

  if (query.isLoading || !draft) return query.error ? <Notice tone="error">{query.error.message}</Notice> : <Spinner label="Loading access settings" />;

  const change = (next: Draft) => {
    setDraft(next);
    setDirty(true);
    setMessage(null);
  };
  const setLevels = (keys: string[], level: AccessLevel) => change({ ...draft, levels: { ...draft.levels, ...Object.fromEntries(keys.map((key) => [key, level])) } });

  async function save() {
    if (!draft || !query.data) return;
    setSaving(true);
    setMessage(null);
    try {
      const listed = new Set(items.map((item) => item.key));
      const body: AccessSettings = {
        features: draft.features,
        content: [
          // Rules for exams that are hidden right now are kept for when they come back.
          ...query.data.settings.content.filter((rule) => !listed.has(rule.key)),
          ...items.map((item) => ({ key: item.key, level: draft.levels[item.key] ?? draft.newContent })),
        ],
        newContent: draft.newContent,
      };
      const settings = await api<AccessSettings>("/api/admin/settings/access", { method: "PUT", body });
      const data = { settings, items };
      queryClient.setQueryData(QUERY_KEY, data);
      setDraft(toDraft(data));
      setDirty(false);
      setMessage({ tone: "info", text: "Saved. Applies to what students start from now on; tests already started can still be finished." });
    } catch (caught) {
      setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 pb-4">
      <Notice tone="info">
        <b>Free</b> opens it to every account. <b>Paid only</b> keeps it for accounts with an active paid plan (set on the Users page); free accounts see it
        locked, with a link to the pricing page. Staff and admins can open everything. A drill or mock needs both its way of practising and its exam to be open.
      </Notice>

      <Card>
        <h2 className="font-bold">Ways of practising</h2>
        <ul className="mt-3 divide-y divide-slate-200">
          {ACCESS_FEATURES.map((feature) => (
            <li key={feature} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
              <div>
                <p className="font-bold">{ACCESS_FEATURE_LABELS[feature].label}</p>
                <p className="text-xs text-slate-600">{ACCESS_FEATURE_LABELS[feature].description}</p>
              </div>
              <LevelSwitch
                label={`Access to ${ACCESS_FEATURE_LABELS[feature].label}`}
                value={draft.features[feature]}
                disabled={!canWrite}
                onChange={(level) => change({ ...draft, features: { ...draft.features, [feature]: level } })}
              />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-600">
          A free account&apos;s adaptive mock with &ldquo;All exams&rdquo; draws only from the exams open to it. Full-length practice tests and uploaded exams taken whole are set
          one by one below.
        </p>
      </Card>

      <ItemList
        title="Exams"
        description="Drills and the adaptive mock pool. An uploaded exam's “Take Full Test” follows the same setting."
        items={exams}
        levels={draft.levels}
        canWrite={canWrite}
        onChange={setLevels}
      />
      <ItemList title="Full-Length Practice Tests" description="Uploaded practice tests on the student Home page." items={practice} levels={draft.levels} canWrite={canWrite} onChange={setLevels} />

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-bold">Exams and tests added later</h2>
          <p className="mt-0.5 text-xs text-slate-600">Anything published after this page was last saved starts with this setting.</p>
        </div>
        <LevelSwitch label="Access to exams and tests added later" value={draft.newContent} disabled={!canWrite} onChange={(level) => change({ ...draft, newContent: level })} />
      </Card>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {canWrite ? (
        // Pinned to the bottom of the screen only while there is something to save.
        <div className={`${dirty ? "sticky bottom-0 z-10 shadow-lg" : ""} flex flex-wrap items-center justify-end gap-3 rounded-xl border border-slate-900 bg-white px-4 py-3`}>
          <span className="mr-auto text-sm text-slate-600">{dirty ? "You have unsaved changes." : "All changes saved."}</span>
          {dirty && (
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => {
                setDraft(toDraft(query.data!));
                setDirty(false);
                setMessage(null);
              }}
            >
              Discard
            </Button>
          )}
          <Button disabled={saving || !dirty} onClick={save}>
            {saving ? "Saving…" : "Save access"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-slate-600">Your account can view these settings but not change them.</p>
      )}
    </div>
  );
}

export default function AdminAccessPage() {
  return (
    <RequireUser permission="papers:read">
      {(user) => (
        <>
          <PageHeader title="Access" subtitle="Choose what free accounts can open. Everything else is for paid plans." />
          <Access canWrite={user.permissions.includes("papers:write")} />
        </>
      )}
    </RequireUser>
  );
}
