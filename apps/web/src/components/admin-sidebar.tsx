"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminStats, Permission, PublicUser } from "@satsharks/types";
import { api } from "@/lib/api";

// The admin sections. Add a new one here (with the permission that may see it) and it appears in
// both the desktop sidebar and the phone tab strip.
interface Section {
  href: string;
  label: string;
  permission: Permission;
  icon: ReactNode;
  // The pending-reports count is shown next to Reports.
  badge?: "pendingReports";
}

const SECTIONS: Section[] = [
  { href: "/admin", label: "Dashboard", permission: "admin:access", icon: <path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z" /> },
  { href: "/admin/papers", label: "Papers", permission: "papers:read", icon: <path d="M7 3h7l5 5v13H7V3zm7 0v5h5M10 13h6M10 17h6" /> },
  { href: "/admin/questions", label: "Questions", permission: "questions:read", icon: <path d="M9.1 9a3 3 0 1 1 4.2 2.7c-.8.4-1.3 1.1-1.3 2v.3M12 17.5h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" /> },
  { href: "/admin/reports", label: "Reports", permission: "reports:read", icon: <path d="M5 21V4m0 0h11l-2 4 2 4H5" />, badge: "pendingReports" },
  { href: "/admin/settings", label: "Settings", permission: "admin:access", icon: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" /> },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export function AdminSidebar({ user }: { user: PublicUser }) {
  const pathname = usePathname();
  // Shares the dashboard's query, so the count is fetched once and refreshed with it.
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => api<AdminStats>("/api/admin/stats"), staleTime: 30_000 });
  const pending = stats.data?.reports.pending ?? 0;
  const sections = SECTIONS.filter((section) => user.permissions.includes(section.permission));

  const badge = (section: Section, active: boolean) =>
    section.badge === "pendingReports" && pending > 0 ? (
      <span
        aria-label={`${pending} pending`}
        className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? "bg-white text-brand-600" : "bg-red-600 text-white"}`}
      >
        {pending > 99 ? "99+" : pending}
      </span>
    ) : null;

  return (
    <>
      {/* Desktop: a sticky column beside the content. */}
      <aside className="hidden w-60 flex-none lg:block">
        <nav aria-label="Admin" className="sticky top-4 rounded-2xl border border-slate-900 bg-white p-3">
          <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-slate-500">Admin portal</p>
          <ul className="space-y-1">
            {sections.map((section) => {
              const active = isActive(pathname, section.href);
              return (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${active ? "bg-brand-500 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                  >
                    <Icon>{section.icon}</Icon>
                    {section.label}
                    {badge(section, active)}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 truncate border-t border-slate-200 px-3 pt-3 text-xs text-slate-500">
            {user.name} · <span className="capitalize">{user.role}</span>
          </p>
        </nav>
      </aside>

      {/* Phones and tablets: a tab strip under the page header that scrolls sideways if needed. */}
      <nav aria-label="Admin" className="-mx-4 mb-4 overflow-x-auto border-b border-slate-300 px-4 lg:hidden md:-mx-8 md:px-8">
        <ul className="flex min-w-max gap-1">
          {sections.map((section) => {
            const active = isActive(pathname, section.href);
            return (
              <li key={section.href}>
                <Link
                  href={section.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-bold ${active ? "border-brand-500 text-brand-600" : "border-transparent text-slate-600 hover:text-black"}`}
                >
                  <Icon>{section.icon}</Icon>
                  {section.label}
                  {section.badge === "pendingReports" && pending > 0 && (
                    <span aria-label={`${pending} pending`} className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {pending > 99 ? "99+" : pending}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
