"use client";

import Link from "next/link";
import { homePath, isStaffUser, useMe } from "@/lib/auth";

// Both places that use these sit on the landing page's blue background.
const primary =
  "inline-flex min-h-[58px] items-center justify-center gap-4 rounded-2xl bg-white py-2.5 pl-7 pr-3 text-[17px] font-extrabold text-brand-700 shadow-[0_18px_40px_-16px_rgba(10,16,60,0.6)] transition hover:-translate-y-0.5 hover:bg-brand-50";
const secondary = "inline-flex min-h-[58px] items-center justify-center rounded-2xl border border-white/40 px-7 text-[17px] font-bold text-white transition hover:bg-white/10";

function Arrow() {
  return (
    <span aria-hidden className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] bg-brand-500">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}

// Signed-in visitors get a way into the app instead of "sign up / see plans". Nothing is shown
// while the session is being checked, so the wrong buttons never flash.
export function HomeActions({ className = "" }: { className?: string }) {
  const { data: user, isLoading } = useMe();
  if (isLoading) return <div className={`h-[58px] ${className}`} />;

  return (
    <div className={`flex flex-col items-stretch gap-3 sm:flex-row sm:items-center ${className}`}>
      {user ? (
        <Link href={homePath(user)} className={primary}>
          {isStaffUser(user) ? "Open the admin portal" : "Go to your dashboard"}
          <Arrow />
        </Link>
      ) : (
        <>
          <Link href="/register" className={primary}>
            Create a free account
            <Arrow />
          </Link>
          <Link href="/pricing" className={secondary}>
            See plans
          </Link>
        </>
      )}
    </div>
  );
}
