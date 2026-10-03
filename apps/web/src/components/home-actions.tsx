"use client";

import Link from "next/link";
import { homePath, isStaffUser, useMe } from "@/lib/auth";

const styles = {
  // On the page background.
  hero: {
    primary: "inline-flex h-12 items-center justify-center rounded-lg bg-brand-500 px-6 text-[15px] font-bold text-white shadow-sm transition hover:bg-brand-600",
    secondary: "inline-flex h-12 items-center justify-center rounded-lg border border-slate-900 bg-white px-6 text-[15px] font-bold text-slate-900 transition hover:bg-slate-50",
  },
  // On the blue call-to-action band.
  band: {
    primary: "inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 text-[15px] font-bold text-brand-600 transition hover:bg-brand-50",
    secondary: "inline-flex h-12 items-center justify-center rounded-lg border border-white/60 px-6 text-[15px] font-bold text-white transition hover:bg-white/10",
  },
} as const;

// Signed-in visitors get a way into the app instead of "sign up / log in". Nothing is shown
// while the session is being checked, so the wrong buttons never flash.
export function HomeActions({ variant = "hero", className = "" }: { variant?: keyof typeof styles; className?: string }) {
  const { data: user, isLoading } = useMe();
  const style = styles[variant];
  if (isLoading) return <div className={`h-12 ${className}`} />;

  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      {user ? (
        <Link href={homePath(user)} className={style.primary}>
          {isStaffUser(user) ? "Open the admin portal" : "Go to your dashboard"}
        </Link>
      ) : (
        <>
          <Link href="/register" className={style.primary}>
            Create a free account
          </Link>
          <Link href="/pricing" className={style.secondary}>
            See plans
          </Link>
        </>
      )}
    </div>
  );
}
