"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMe, useSwitchUser } from "@/lib/auth";

const button = "whitespace-nowrap rounded-[6px] bg-brand-500 px-5 py-2 text-[14px] font-bold tracking-tight text-white transition hover:opacity-90";

export function Nav() {
  const router = useRouter();
  const switchUser = useSwitchUser();
  const { data: user, isLoading } = useMe();
  // Admin links are shown only when the signed-in account has admin access. The pages and the
  // API check this again; hiding the link is for clarity, not security.
  const isAdmin = user?.permissions.includes("admin:access") ?? false;

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    switchUser(null);
    router.push("/");
  }

  return (
    <header className="border-b border-slate-900 bg-white">
      <nav className="mx-auto flex w-full max-w-[1700px] flex-wrap items-center gap-4 px-4 py-3 md:px-8">
        <Link href={user ? "/dashboard" : "/"} className="mr-auto text-[28px] font-bold tracking-tight text-brand-500">
          SAT Sharks
        </Link>
        {user && (
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/dashboard" className={button}>
              Home
            </Link>
            <Link href="/practice" className={button}>
              Review
            </Link>
            {isAdmin && (
              <Link href="/admin" className={button}>
                Admin
              </Link>
            )}
            <span aria-hidden className="mx-1 hidden h-6 w-px bg-slate-400 sm:block" />
            <button type="button" onClick={logout} className={`${button} cursor-pointer`}>
              Sign Out
            </button>
          </div>
        )}
        {!user && !isLoading && (
          <div className="flex items-center gap-4">
            <Link href="/login" className="whitespace-nowrap px-2 text-[14px] font-bold text-slate-600 transition hover:text-black">
              Log In
            </Link>
            <Link href="/register" className={button}>
              Sign Up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
