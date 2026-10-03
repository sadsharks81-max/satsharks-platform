"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { USER_ROLES, type AdminUser, type UserListCounts } from "@satsharks/types";
import { RequireUser } from "@/components/require-user";
import { Button, Card, Notice, PageHeader, Toggle } from "@/components/ui";
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

function Users() {
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
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));
  const choose = (next: TabId) => {
    setTab(next);
    setPage(1);
  };

  return (
    <>
      <PageHeader title="Users" subtitle="Search accounts, change a student's plan, disable or delete an account." />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <Toggle key={entry.id} active={tab === entry.id} onClick={() => choose(entry.id)}>
            {entry.label}
            {counts ? ` (${counts[entry.id].toLocaleString()})` : ""}
          </Toggle>
        ))}
      </div>

      <Card className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-bold">
          Search
          <input className={`${selectClass} px-3`} value={searchInput} maxLength={100} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name or email" />
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
      </Card>

      {list.error && <Notice tone="error">{list.error.message}</Notice>}
      {list.data && list.data.users.length === 0 && <Notice tone="info">No users match.</Notice>}

      {list.data && list.data.users.length > 0 && (
        <Card className={`p-0 ${list.isFetching ? "opacity-60" : ""}`}>
          {/* Phones: one row per user. */}
          <ul className="divide-y divide-slate-200 md:hidden">
            {list.data.users.map((user) => (
              <li key={user.id}>
                <Link href={`/admin/users/${user.id}`} className="block px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-bold">{user.name}</span>
                    <StatusBadge user={user} />
                  </div>
                  <p className="truncate text-sm text-slate-600">{user.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <PlanBadge user={user} />
                    <span>· {countryLabel(user.country)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Tablets and up: a table. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-900 text-xs uppercase text-slate-600">
                <tr>
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
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="max-w-xs px-4 py-3">
                      <div className="truncate font-bold">{user.name}</div>
                      <div className="truncate text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-3 py-3">
                      <PlanBadge user={user} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{countryLabel(user.country)}</td>
                    <td className="px-3 py-3 capitalize">{user.role}</td>
                    <td className="px-3 py-3">
                      <StatusBadge user={user} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDay(user.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/users/${user.id}`} className="inline-block rounded-lg border border-slate-900 px-3 py-1.5 text-xs font-bold hover:bg-slate-100">
                        Manage
                      </Link>
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
  return <RequireUser permission="users:read">{() => <Users />}</RequireUser>;
}
