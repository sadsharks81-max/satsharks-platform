"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { PublicUser } from "@satsharks/types";
import { useEngagement } from "@/lib/engagement";

// The student's own pages. Add one here and it appears in both the desktop sidebar and the phone
// tab strip.
interface Section {
  href: string;
  label: string;
  icon: ReactNode;
  // Mistakes due for a retry are counted next to the mistake bank.
  badge?: "mistakesDue";
}

const SECTIONS: Section[] = [
  { href: "/portal", label: "Dashboard", icon: <path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z" /> },
  { href: "/practice", label: "My tests", icon: <path d="M9 4h6m-6 0a2 2 0 0 0-2 2v0h10v0a2 2 0 0 0-2-2M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1M7 6H5v15h14V6h-2M9 12l2 2 4-4M9 17h6" /> },
  { href: "/history", label: "History", icon: <path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 7v5l3 2" /> },
  { href: "/mistakes", label: "Mistake bank", icon: <path d="M12 9v4m0 4h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />, badge: "mistakesDue" },
  { href: "/analytics", label: "Analytics", icon: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" /> },
  { href: "/goals", label: "Goals & streaks", icon: <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z" /> },
  { href: "/leaderboard", label: "Leaderboard", icon: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /> },
  { href: "/billing", label: "Plan & billing", icon: <path d="M3 7h18v12H3V7zm0 4h18M7 15h3" /> },
];

const HELP = [
  { href: "/dashboard", label: "Home" },
  { href: "/sat-dates", label: "SAT dates" },
  { href: "/faq", label: "FAQ" },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

// Premium (a paid plan that has not ended) or Free, under "Student portal". `user.plan` is the
// effective plan and is re-read from the server, so an upgrade by an admin or a payment shows here.
export function MemberBadge({ user, small = false }: { user: PublicUser; small?: boolean }) {
  const premium = user.plan === "paid";
  const size = small ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]";
  const body = (
    <>
      <svg aria-hidden viewBox="0 0 24 24" className={`${small ? "h-3.5 w-3.5" : "h-4 w-4"} flex-none`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {premium ? (
          <>
            <circle cx="12" cy="9" r="6" />
            <path d="m12 6.2.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 8.3l2-.3L12 6.2zM8.5 14l-1.5 7 5-2.5 5 2.5-1.5-7" />
          </>
        ) : (
          <>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </>
        )}
      </svg>
      {premium ? "Premium member" : "Free member"}
    </>
  );
  const className = `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-extrabold uppercase tracking-wide ${size}`;
  if (premium) {
    return (
      <span className={`${className} border-red-300 bg-red-50 text-red-600`} title={user.planExpiresAt ? `Premium until ${new Date(user.planExpiresAt).toLocaleDateString()}` : "Premium plan"}>
        {body}
      </span>
    );
  }
  return (
    <Link href="/pricing" className={`${className} border-slate-300 bg-slate-50 text-slate-600 hover:border-brand-500 hover:text-brand-600`} title="Free plan: see the paid plans">
      {body}
    </Link>
  );
}

export function StudentSidebar({ user }: { user: PublicUser }) {
  const pathname = usePathname();
  const engagement = useEngagement();
  const due = engagement.data?.mistakesDue ?? 0;
  const streak = engagement.data?.streak;

  const count = (section: Section, active: boolean, small = false) =>
    section.badge === "mistakesDue" && due > 0 ? (
      <span
        aria-label={`${due} due`}
        className={`${small ? "" : "ml-auto"} rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? "bg-white text-brand-600" : "bg-red-600 text-white"}`}
      >
        {due > 99 ? "99+" : due}
      </span>
    ) : null;

  return (
    <>
      {/* Desktop: a sticky column beside the content. */}
      <aside className="hidden w-60 flex-none lg:block">
        <nav aria-label="Student" className="sticky top-4 rounded-2xl border border-slate-900 bg-white p-3">
          <p className="px-3 pt-1 text-xs font-bold uppercase tracking-wide text-slate-500">Student portal</p>
          <div className="px-3 pb-3 pt-2">
            <MemberBadge user={user} />
          </div>
          <ul className="space-y-1">
            {SECTIONS.map((section) => {
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
                    {count(section, active)}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 border-t border-slate-200 px-3 pt-3">
            {streak && (
              <Link href="/goals" className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800 hover:text-brand-600">
                <svg aria-hidden viewBox="0 0 24 24" className={`h-5 w-5 ${streak.current > 0 ? "text-orange-500" : "text-slate-400"}`} fill="currentColor">
                  <path d="M12 2c1.2 3.6 6 6 6 12a6 6 0 0 1-12 0c0-2.4 1.2-4.2 2.4-5.4 0 2.4 1.2 3.6 2.4 3.6 0-3.6-1.2-6 1.2-10.2z" />
                </svg>
                {streak.current}-day streak
              </Link>
            )}
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
              {HELP.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-brand-600 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
              {user.plan === "free" && (
                <li>
                  <Link href="/pricing" className="hover:text-brand-600 hover:underline">
                    Upgrade
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </nav>
      </aside>

      {/* Phones and tablets: a tab strip under the page header that scrolls sideways if needed. */}
      <nav aria-label="Student" className="-mx-4 mb-4 overflow-x-auto border-b border-slate-300 px-4 lg:hidden md:-mx-8 md:px-8">
        <ul className="flex min-w-max gap-1">
          <li className="flex items-center pr-2">
            <MemberBadge user={user} small />
          </li>
          {SECTIONS.map((section) => {
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
                  {count(section, false, true)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
