"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";

const pill = "rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600";

export function Nav() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useMe();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    // Drop everything cached for the signed-out user, not just the session.
    queryClient.clear();
    router.push("/");
  }

  return (
    <header className="border-b border-slate-900 bg-white">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-8">
        <Link href={user ? "/dashboard" : "/"} className="mr-auto text-2xl font-extrabold tracking-tight text-brand-500">
          SAT Sharks
        </Link>
        {user && (
          <>
            <Link href="/dashboard" className={pill}>
              Home
            </Link>
            <Link href="/practice" className={pill}>
              Review
            </Link>
            {user.permissions.includes("admin:access") && (
              <Link href="/admin" className={pill}>
                Admin
              </Link>
            )}
            <span aria-hidden className="mx-1 hidden h-6 border-l border-slate-400 sm:block" />
            <button type="button" onClick={logout} className={`${pill} cursor-pointer`}>
              Sign Out
            </button>
          </>
        )}
        {!user && !isLoading && (
          <>
            <Link href="/login" className={pill}>
              Log In
            </Link>
            <Link href="/register" className={pill}>
              Sign Up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
