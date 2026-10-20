"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { DELETED_RESTORE_DAYS, USER_ROLES, type AdminUser, type UserListCounts } from "@satsharks/types";
import { RequireUser } from "@/components/require-user";
import { Button, Card, Modal, Notice, PageHeader, Toggle } from "@/components/ui";
import { countryLabel, formatDay, PlanBadge, StatusBadge } from "@/components/user-badges";
import { api } from "@/lib/api";

type UserList = { users: AdminUser[]; total: number; page: number; pageSize: number; counts: UserListCounts };

const PAGE_SIZE = 25;
const selectClass = "h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none focus:border-brand-500";

// Tabs: plan for active accounts, plus disabled and deleted accounts.
const TABS = [
  { id: "all", label: "All", filter: {} },
  { id: "paid", label: "Paid", filter: { plan: "paid" } },
  { id: "free", label: "Free", filter: { plan: "free" } },
  { id: "blocked", label: "Disabled", filter: { status: "blocked" } },
  { id: "deleted", label: "Deleted", filter: { status: "deleted" } },
] as const;
type TabId = (typeof TABS)[number]["id"];

// Deleted accounts can be restored until an admin clears them here; this removes them for good.
function ClearDeleted({ count }: { count: number }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  async function clear() {
    setBusy(true);
    setMessage(null);
    try {
      const { removed } = await api<{ removed: number }>("/api/admin/users/deleted", { method: "DELETE" });
      setOpen(false);
      setMessage({ tone: "info", text: `${removed.toLocaleString()} deleted account${removed === 1 ? "" : "s"} removed permanently.` });
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (caught) {
      setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "Could not remove the deleted accounts" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4">
      {count > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-700">Deleted accounts can be restored until you clear them. Clearing removes them and all their data for good.</p>
          <Button variant="danger" onClick={() => setOpen(true)}>
            Delete all permanently
          </Button>
        </Card>
      )}
      {message && (
        <div className="mt-3">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
      {open && (
        <Modal title={`Permanently delete ${count.toLocaleString()} account${count === 1 ? "" : "s"}?`} onClose={() => !busy && setOpen(false)}>
          <p className="text-sm text-slate-700">
            Every account in the Deleted tab is removed for good, with its tests, history, mistake bank and points. This cannot be undone. Problem reports they sent are kept,
            without their name.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={busy} onClick={clear}>
              {busy ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Delete (or restore) straight from the list, after a confirmation (proposal 4.2).
function DeleteOrRestore({ user, onDone }: { user: AdminUser; onDone: (text: string) => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restore = user.status === "deleted";

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/users/${user.id}`, { method: "PATCH", body: { status: restore ? "active" : "deleted" } });
      setOpen(false);
      onDone(restore ? `${user.name} is restored and can log in again.` : `${user.name} is deleted and signed out. You can restore the account for ${DELETED_RESTORE_DAYS} days.`);
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={restore ? `Restore ${user.name}` : `Delete ${user.name}`}
        className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${restore ? "border-slate-900 hover:bg-slate-100" : "border-red-600 text-red-700 hover:bg-red-50"}`}
      >
        {restore ? (
          "Restore"
        ) : (
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3" />
          </svg>
        )}
      </button>
      {open && (
        <Modal title={restore ? "Restore this account?" : "Delete this account?"} onClose={() => !busy && setOpen(false)}>
          <p className="text-sm text-slate-700">
            {restore
              ? `${user.name} (${user.email}) will be able to log in again, with all their data.`
              : `${user.name} (${user.email}) is signed out at once and cannot log in. Their data is kept for ${DELETED_RESTORE_DAYS} days, so you can restore the account from the Deleted tab; after that it is removed for good.`}
          </p>
          {error && (
            <div className="mt-3">
              <Notice tone="error">{error}</Notice>
            </div>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant={restore ? "primary" : "danger"} disabled={busy} onClick={apply}>
              {busy ? "Saving…" : restore ? "Restore account" : "Delete account"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

// What is ticked: some accounts by id, or every account matching the filters (across all pages).
type Selection = { all: false; ids: Set<string> } | { all: true };
const NOTHING: Selection = { all: false, ids: new Set() };

// Admins (and your own account) are never changed in bulk: the server skips them too.
const selectable = (user: AdminUser, meId: string) => user.id !== meId && user.role !== "admin";

type BulkAction = "delete" | "restore" | "purge";
const BULK_TEXT: Record<BulkAction, { button: string; title: (n: string) => string; body: string; done: (n: number) => string }> = {
  delete: {
    button: "Delete selected",
    title: (n) => `Delete ${n}?`,
    body: `They are signed out at once and cannot log in. Their data is kept for ${DELETED_RESTORE_DAYS} days, so you can restore them from the Deleted tab; after that they are removed for good.`,
    done: (n) => `${n.toLocaleString()} account${n === 1 ? "" : "s"} deleted. You can restore them from the Deleted tab for ${DELETED_RESTORE_DAYS} days.`,
  },
  restore: {
    button: "Restore selected",
    title: (n) => `Restore ${n}?`,
    body: "They can log in again, with all their data.",
    done: (n) => `${n.toLocaleString()} account${n === 1 ? "" : "s"} restored.`,
  },
  purge: {
    button: "Delete permanently",
    title: (n) => `Permanently delete ${n}?`,
    body: "They are removed for good, with their tests, history, mistake bank and points. This cannot be undone. Problem reports they sent are kept, without their name.",
    done: (n) => `${n.toLocaleString()} account${n === 1 ? "" : "s"} removed permanently.`,
  },
};

// The bar shown while accounts are ticked, with the actions that fit the tab, and their confirmation.
function BulkBar({
  selection,
  count,
  deletedTab,
  body,
  onClear,
  onDone,
}: {
  selection: Selection;
  count: number;
  deletedTab: boolean;
  body: { ids: string[] } | { filter: Record<string, string> };
  onClear: () => void;
  onDone: (text: string) => void;
}) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<BulkAction | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = `${count.toLocaleString()} account${count === 1 ? "" : "s"}`;
  // Acting on every matching account (possibly thousands) asks for the word DELETE to be typed.
  const needsTyping = selection.all && action !== "restore";

  async function apply() {
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      const { changed, skipped } = await api<{ changed: number; skipped: number }>("/api/admin/users/bulk", { method: "POST", body: { action, ...body } });
      setAction(null);
      setTyped("");
      onClear();
      onDone(BULK_TEXT[action].done(changed) + (skipped > 0 ? ` ${skipped.toLocaleString()} left as they were (admin accounts, your own, or already changed).` : ""));
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const actions: BulkAction[] = deletedTab ? ["restore", "purge"] : ["delete"];
  return (
    <>
      <div className="sticky top-2 z-30 mb-4 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-brand-500 bg-brand-50 px-4 py-3 shadow-sm">
        <span className="text-sm font-bold">{selection.all ? `All ${label} matching these filters are selected` : `${label} selected`}</span>
        <span className="ml-auto flex flex-wrap gap-2">
          {actions.map((entry) => (
            <Button key={entry} size="sm" variant={entry === "restore" ? "primary" : "danger"} onClick={() => setAction(entry)}>
              {BULK_TEXT[entry].button}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={onClear}>
            Clear selection
          </Button>
        </span>
      </div>
      {action && (
        <Modal title={BULK_TEXT[action].title(label)} onClose={() => !busy && (setAction(null), setTyped(""))}>
          <p className="text-sm text-slate-700">{BULK_TEXT[action].body}</p>
          <p className="mt-2 text-sm text-slate-700">Admin accounts and your own account are never changed this way.</p>
          {needsTyping && (
            <label className="mt-4 block text-xs font-bold">
              Type DELETE to confirm
              <input value={typed} onChange={(event) => setTyped(event.target.value)} className={`${selectClass} mt-1 w-full px-3 font-normal`} autoComplete="off" />
            </label>
          )}
          {error && (
            <div className="mt-3">
              <Notice tone="error">{error}</Notice>
            </div>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => (setAction(null), setTyped(""))}>
              Cancel
            </Button>
            <Button variant={action === "restore" ? "primary" : "danger"} disabled={busy || (needsTyping && typed.trim() !== "DELETE")} onClick={apply}>
              {busy ? "Saving…" : BULK_TEXT[action].button}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Checkbox({ checked, indeterminate = false, disabled = false, label, onChange }: { checked: boolean; indeterminate?: boolean; disabled?: boolean; label: string; onChange: () => void }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      title={disabled ? "Admin accounts and your own account are changed one at a time" : undefined}
      checked={checked}
      disabled={disabled}
      ref={(element) => {
        if (element) element.indeterminate = indeterminate;
      }}
      onChange={onChange}
      className="h-4 w-4 cursor-pointer accent-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}

function Users({ canWrite, meId }: { canWrite: boolean; meId: string }) {
  const [done, setDone] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("all");
  const [region, setRegion] = useState("");
  const [role, setRole] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Search runs shortly after typing stops, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filter = TABS.find((entry) => entry.id === tab)!.filter as Record<string, string>;
  const params = new URLSearchParams({ ...filter, region, role, search, page: String(page), pageSize: String(PAGE_SIZE) });
  const list = useQuery({
    queryKey: ["admin", "users", params.toString()],
    queryFn: () => api<UserList>(`/api/admin/users?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
  const counts = list.data?.counts;
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const choose = (next: TabId) => {
    setTab(next);
    setPage(1);
  };

  // Ticked accounts stay ticked across pages; changing a tab or filter starts again.
  const [selection, setSelection] = useState<Selection>(NOTHING);
  useEffect(() => setSelection(NOTHING), [tab, region, role, search]);
  const pickable = (list.data?.users ?? []).filter((user) => selectable(user, meId));
  const ticked = (id: string) => selection.all || selection.ids.has(id);
  const pageAll = pickable.length > 0 && pickable.every((user) => ticked(user.id));
  const pageSome = pickable.some((user) => ticked(user.id));
  const selectedCount = selection.all ? total : selection.ids.size;
  function toggle(id: string) {
    setSelection((current) => {
      // Unticking one row while "all" is selected keeps the rest of this page ticked.
      const ids = new Set(current.all ? pickable.map((user) => user.id) : current.ids);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { all: false, ids };
    });
  }
  function togglePage() {
    setSelection((current) => {
      const ids = new Set(current.all ? [] : current.ids);
      for (const user of pickable) {
        if (pageAll) ids.delete(user.id);
        else ids.add(user.id);
      }
      return { all: false, ids };
    });
  }
  const box = (user: AdminUser) => (
    <Checkbox checked={ticked(user.id) && selectable(user, meId)} disabled={!selectable(user, meId)} label={`Select ${user.name}`} onChange={() => toggle(user.id)} />
  );

  return (
    <>
      <PageHeader title="Users" subtitle="Search accounts by name, email or phone, change a student's plan, disable or delete an account." />
      {done && (
        <div className="mb-4">
          <Notice tone="info">{done}</Notice>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <Toggle key={entry.id} active={tab === entry.id} onClick={() => choose(entry.id)}>
            {entry.label}
            {counts ? ` (${counts[entry.id].toLocaleString()})` : ""}
          </Toggle>
        ))}
      </div>

      {tab === "deleted" && canWrite && <ClearDeleted count={counts?.deleted ?? 0} />}

      <Card className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-bold">
          Search
          <input className={`${selectClass} px-3`} value={searchInput} maxLength={100} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name, email or phone" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Region
          <select className={selectClass} value={region} onChange={(event) => (setRegion(event.target.value), setPage(1))}>
            <option value="">All regions</option>
            <option value="local">Pakistan (local)</option>
            <option value="international">International</option>
            <option value="unknown">No country</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Role
          <select className={`${selectClass} capitalize`} value={role} onChange={(event) => (setRole(event.target.value), setPage(1))}>
            <option value="">All roles</option>
            {USER_ROLES.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        {/* Same filters as the list, every page. A plain link: the browser downloads the file with the session cookie. */}
        <a
          href={`/api/admin/users/export?${new URLSearchParams({ ...filter, region, role, search }).toString()}`}
          className="flex h-10 items-center rounded-lg border border-slate-900 bg-white px-4 text-sm font-bold hover:bg-slate-100"
          download
        >
          Export CSV
        </a>
        {canWrite && (
          <Button variant="outline" className="h-10" disabled={total === 0 || selection.all} onClick={() => setSelection({ all: true })}>
            Select all{total > 0 ? ` (${total.toLocaleString()})` : ""}
          </Button>
        )}
      </Card>

      {canWrite && selectedCount > 0 && (
        <BulkBar
          selection={selection}
          count={selectedCount}
          deletedTab={tab === "deleted"}
          body={selection.all ? { filter: { ...filter, region, role, search } } : { ids: [...selection.ids] }}
          onClear={() => setSelection(NOTHING)}
          onDone={setDone}
        />
      )}
      {canWrite && pageAll && !selection.all && total > pickable.length && (
        <p className="-mt-2 mb-4 text-center text-sm">
          All {pickable.length} on this page are selected.{" "}
          <button type="button" onClick={() => setSelection({ all: true })} className="cursor-pointer font-bold text-brand-600 hover:underline">
            Select all {total.toLocaleString()} matching users
          </button>
        </p>
      )}

      {list.error && <Notice tone="error">{list.error.message}</Notice>}
      {list.data && list.data.users.length === 0 && <Notice tone="info">No users match.</Notice>}

      {list.data && list.data.users.length > 0 && (
        <Card className={`p-0 ${list.isFetching ? "opacity-60" : ""}`}>
          {/* Phones: one row per user. */}
          <ul className="divide-y divide-slate-200 md:hidden">
            {canWrite && (
              <li className="flex items-center gap-3 px-4 py-3 text-sm font-bold">
                <Checkbox checked={pageAll} indeterminate={pageSome && !pageAll} disabled={pickable.length === 0} label="Select everyone on this page" onChange={togglePage} />
                Select this page
              </li>
            )}
            {list.data.users.map((user) => (
              <li key={user.id} className={canWrite ? "flex items-start" : ""}>
                {canWrite && <span className="flex-none py-4 pl-4">{box(user)}</span>}
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/users/${user.id}`} className="block px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold">{user.name}</span>
                      <StatusBadge user={user} />
                    </div>
                    <p className="truncate text-sm text-slate-600">{user.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <PlanBadge user={user} />
                      <span>· {countryLabel(user.country)}</span>
                      {user.restorableUntil && <span>· restore until {formatDay(user.restorableUntil)}</span>}
                    </div>
                  </Link>
                  {canWrite && user.id !== meId && (
                    <div className="flex justify-end px-4 pb-3">
                      <DeleteOrRestore user={user} onDone={setDone} />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Tablets and up: a table. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-900 text-xs uppercase text-slate-600">
                <tr>
                  {canWrite && (
                    <th className="w-10 py-3 pl-4">
                      <Checkbox checked={pageAll} indeterminate={pageSome && !pageAll} disabled={pickable.length === 0} label="Select everyone on this page" onChange={togglePage} />
                    </th>
                  )}
                  <th className="px-4 py-3">User</th>
                  <th className="px-3 py-3">Plan</th>
                  <th className="px-3 py-3">Country</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {list.data.users.map((user) => (
                  <tr key={user.id} className={ticked(user.id) && selectable(user, meId) ? "bg-brand-50" : "hover:bg-slate-50"}>
                    {canWrite && <td className="py-3 pl-4">{box(user)}</td>}
                    <td className="max-w-xs px-4 py-3">
                      <div className="truncate font-bold">{user.name}</div>
                      <div className="truncate text-xs text-slate-500">
                        {user.email}
                        {user.phone && ` · ${user.phone}`}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <PlanBadge user={user} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{countryLabel(user.country)}</td>
                    <td className="px-3 py-3 capitalize">{user.role}</td>
                    <td className="px-3 py-3">
                      <StatusBadge user={user} />
                      {user.restorableUntil && <div className="mt-1 whitespace-nowrap text-xs text-slate-500">until {formatDay(user.restorableUntil)}</div>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDay(user.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-2">
                        <Link href={`/admin/users/${user.id}`} className="inline-block rounded-lg border border-slate-900 px-3 py-1.5 text-xs font-bold hover:bg-slate-100">
                          Manage
                        </Link>
                        {canWrite && user.id !== meId && <DeleteOrRestore user={user} onDone={setDone} />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-900 px-4 py-3 text-sm">
            <span>
              {list.data.total.toLocaleString()} user{list.data.total === 1 ? "" : "s"} · page <b>{page}</b> of <b>{pages}</b>
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
    </>
  );
}

export default function AdminUsersPage() {
  return <RequireUser permission="users:read">{(me) => <Users canWrite={me.permissions.includes("users:write")} meId={me.id} />}</RequireUser>;
}
