"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PAID_PLAN_LABELS,
  PAID_PLANS,
  USER_REGION_LABELS,
  USER_ROLES,
  type AdminUser,
  type AdminUserActivity,
  type PaidPlan,
  type PublicUser,
  type UserRole,
  type UserStatus,
} from "@satsharks/types";
import { RequireUser } from "@/components/require-user";
import { Button, Card, Modal, Notice, PageHeader, Spinner } from "@/components/ui";
import { countryLabel, formatDay, PlanBadge, StatusBadge } from "@/components/user-badges";
import { api } from "@/lib/api";

type Detail = { user: AdminUser; activity: AdminUserActivity };

const inputClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-500 disabled:bg-slate-50";

// A change waiting for confirmation in the dialog.
interface Pending {
  title: string;
  message: string;
  confirm: string;
  danger: boolean;
  body: Record<string, unknown>;
  done: string;
}

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

function UserView({ id, me }: { id: string; me: PublicUser }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "user", id], queryFn: () => api<Detail>(`/api/admin/users/${id}`) });
  const canWrite = me.permissions.includes("users:write");
  const isSelf = me.id === id;

  const [paidPlan, setPaidPlan] = useState<PaidPlan>("monthly");
  const [endsOn, setEndsOn] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  const user = data?.user;
  useEffect(() => {
    if (!user) return;
    setPaidPlan(user.paidPlan ?? "monthly");
    setEndsOn(toDateInput(user.planExpiresAt));
    setRole(user.role);
  }, [user]);

  if (isLoading) return <Spinner label="Loading user" />;
  if (error) return <Notice tone="error">{error.message}</Notice>;
  if (!data || !user) return null;
  const { activity } = data;

  async function apply() {
    if (!pending) return;
    setBusy(true);
    setMessage(null);
    try {
      const { user: saved } = await api<{ user: AdminUser }>(`/api/admin/users/${id}`, { method: "PATCH", body: pending.body });
      queryClient.setQueryData<Detail>(["admin", "user", id], (current) => (current ? { ...current, user: saved } : current));
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      setMessage({ tone: "info", text: pending.done });
    } catch (caught) {
      setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "Could not save" });
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  const setStatus = (status: UserStatus) =>
    setPending(
      status === "blocked"
        ? { title: "Disable this account?", message: `${user.name} will be signed out at once and cannot log in until the account is enabled again. Their data is kept.`, confirm: "Disable account", danger: true, body: { status }, done: "Account disabled." }
        : status === "deleted"
          ? { title: "Delete this account?", message: `${user.name} will be signed out and cannot log in. The account and its data are kept, so you can restore it from the Deleted tab.`, confirm: "Delete account", danger: true, body: { status }, done: "Account deleted. It can be restored." }
          : { title: user.status === "deleted" ? "Restore this account?" : "Enable this account?", message: `${user.name} will be able to log in again.`, confirm: user.status === "deleted" ? "Restore account" : "Enable account", danger: false, body: { status }, done: "Account active again." },
    );

  const activityRows = [
    { label: "Drills", value: activity.drills },
    { label: "Mocks", value: activity.mocks },
    { label: "Full tests", value: activity.fullTests },
    { label: "Finished", value: activity.completed },
    { label: "Best section score", value: activity.bestSectionScore ?? "—" },
    { label: "Best total score", value: activity.bestTotalScore ?? "—" },
    { label: "Problem reports", value: activity.reports },
    { label: "Last active", value: activity.lastActiveAt ? formatDay(activity.lastActiveAt) : "Never practised" },
  ];

  return (
    <>
      <Link href="/admin/users" className="mb-3 inline-block text-sm font-bold text-brand-500 hover:underline">
        ← Users
      </Link>
      <PageHeader title={user.name} subtitle={user.email} />
      {message && (
        <div className="mb-4">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
      {isSelf && (
        <div className="mb-4">
          <Notice tone="info">This is your own account. Your role and account status cannot be changed here.</Notice>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <Card>
            <h2 className="font-bold">Profile</h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Status</dt>
              <dd>
                <StatusBadge user={user} />
              </dd>
              <dt className="text-slate-500">Plan</dt>
              <dd>
                <PlanBadge user={user} />
              </dd>
              <dt className="text-slate-500">Role</dt>
              <dd className="capitalize">{user.role}</dd>
              <dt className="text-slate-500">Country</dt>
              <dd>
                {countryLabel(user.country)}
                {user.region && <span className="text-slate-500"> · {USER_REGION_LABELS[user.region]}</span>}
              </dd>
              <dt className="text-slate-500">Joined</dt>
              <dd>{formatDay(user.createdAt)}</dd>
            </dl>
          </Card>
          <Card>
            <h2 className="font-bold">Activity</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {activityRows.map((row) => (
                <div key={row.label} className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <dd className="text-lg font-bold">{row.value}</dd>
                  <dt className="text-xs text-slate-500">{row.label}</dt>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="font-bold">Plan</h2>
            <p className="mt-1 text-sm text-slate-600">
              Give this account paid access, or move it back to free. A paid plan becomes free by itself after its end date. Free and paid limits are not enforced yet; they arrive with
              payments.
            </p>
            <fieldset disabled={!canWrite || busy} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold">
                Paid plan
                <select className={`${inputClass} mt-1`} value={paidPlan} onChange={(event) => setPaidPlan(event.target.value as PaidPlan)}>
                  {PAID_PLANS.map((plan) => (
                    <option key={plan} value={plan}>
                      {PAID_PLAN_LABELS[plan]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold">
                Ends on (optional)
                <input type="date" className={`${inputClass} mt-1`} value={endsOn} min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)} onChange={(event) => setEndsOn(event.target.value)} />
              </label>
            </fieldset>
            {canWrite && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  disabled={busy}
                  onClick={() =>
                    setPending({
                      title: user.plan === "paid" ? "Update the paid plan?" : "Make this account paid?",
                      message: `${user.name} gets the ${PAID_PLAN_LABELS[paidPlan]} plan${endsOn ? ` until ${formatDay(`${endsOn}T12:00:00Z`)}` : " with no end date"}.`,
                      confirm: user.plan === "paid" ? "Update plan" : "Make paid",
                      danger: false,
                      body: { plan: "paid", paidPlan, planExpiresAt: endsOn || null },
                      done: "Plan saved: paid.",
                    })
                  }
                >
                  {user.plan === "paid" ? "Update paid plan" : "Make paid"}
                </Button>
                {user.plan === "paid" && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setPending({ title: "Move to the free plan?", message: `${user.name} loses paid access straight away.`, confirm: "Make free", danger: true, body: { plan: "free" }, done: "Plan saved: free." })}
                  >
                    Make free
                  </Button>
                )}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-bold">Account</h2>
            <p className="mt-1 text-sm text-slate-600">
              Disabling or deleting signs the user out at once and stops them logging in. Nothing is erased: both can be undone.
            </p>
            {canWrite && !isSelf && (
              <div className="mt-4 flex flex-wrap gap-2">
                {user.status === "active" ? (
                  <>
                    <Button variant="outline" disabled={busy} onClick={() => setStatus("blocked")}>
                      Disable account
                    </Button>
                    <Button variant="danger" disabled={busy} onClick={() => setStatus("deleted")}>
                      Delete account
                    </Button>
                  </>
                ) : (
                  <Button disabled={busy} onClick={() => setStatus("active")}>
                    {user.status === "deleted" ? "Restore account" : "Enable account"}
                  </Button>
                )}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-bold">Role</h2>
            <p className="mt-1 text-sm text-slate-600">
              Students practise. Staff can open the admin portal to view papers, questions and reports. Admins can change everything, including users.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <label className="text-xs font-bold">
                Role
                <select className={`${inputClass} mt-1 w-44 capitalize`} disabled={!canWrite || isSelf || busy} value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                  {USER_ROLES.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
              {canWrite && !isSelf && (
                <Button
                  variant="outline"
                  disabled={busy || role === user.role}
                  onClick={() =>
                    setPending({
                      title: `Make this account ${role === "admin" ? "an admin" : role}?`,
                      message:
                        role === "admin"
                          ? `${user.name} will have full control of the site, including users and settings.`
                          : role === "staff"
                            ? `${user.name} will be able to open the admin portal with read-only access to papers, questions and reports.`
                            : `${user.name} will lose admin access.`,
                      confirm: "Change role",
                      danger: role === "admin",
                      body: { role },
                      done: "Role changed.",
                    })
                  }
                >
                  Change role
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {pending && (
        <Modal title={pending.title} onClose={() => !busy && setPending(null)}>
          <p className="text-sm text-slate-700">{pending.message}</p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button variant={pending.danger ? "danger" : "primary"} disabled={busy} onClick={apply}>
              {busy ? "Saving…" : pending.confirm}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function AdminUserPage() {
  const { id } = useParams<{ id: string }>();
  return <RequireUser permission="users:read">{(me) => <UserView id={id} me={me} />}</RequireUser>;
}
