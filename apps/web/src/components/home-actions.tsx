"use client";

import Link from "next/link";
import { useMe } from "@/lib/auth";

const primary = "rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600";
const secondary = "rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-100";

// Signed-in visitors get a way into the app instead of "sign up / log in". Nothing is shown
// while the session is being checked, so the wrong buttons never flash.
export function HomeActions() {
  const { data: user, isLoading } = useMe();
  if (isLoading) return <div className="mt-8 h-[42px]" />;

  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      {user ? (
        <Link href="/dashboard" className={primary}>
          Go to your dashboard
        </Link>
      ) : (
        <>
          <Link href="/register" className={primary}>
            Create a free account
          </Link>
          <Link href="/login" className={secondary}>
            Log in
          </Link>
        </>
      )}
    </div>
  );
}
