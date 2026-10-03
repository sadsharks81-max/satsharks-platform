"use client";

import { PAID_PLAN_LABELS, USER_STATUS_LABELS, type AdminUser } from "@satsharks/types";
import { Badge } from "./ui";

const formatDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// "PAID · 3 Months · until 21 Dec 2026", or "FREE".
export function PlanBadge({ user }: { user: AdminUser }) {
  if (user.plan === "free") {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <Badge>Free</Badge>
        {user.paidPlan && user.planExpiresAt && <span className="text-xs text-slate-500">paid plan ended {formatDay(user.planExpiresAt)}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone="green">Paid</Badge>
      <span className="text-xs text-slate-600">
        {user.paidPlan ? PAID_PLAN_LABELS[user.paidPlan] : "Paid"}
        {user.planExpiresAt ? ` · until ${formatDay(user.planExpiresAt)}` : " · no end date"}
      </span>
    </span>
  );
}

export function StatusBadge({ user }: { user: AdminUser }) {
  const tone = user.status === "active" ? "brand" : user.status === "blocked" ? "amber" : "red";
  return <Badge tone={tone}>{USER_STATUS_LABELS[user.status]}</Badge>;
}

// Country names come from the browser's locale data; admin pages render only in the browser.
export function countryLabel(code: string | null): string {
  if (!code) return "Not given";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export { formatDay };
