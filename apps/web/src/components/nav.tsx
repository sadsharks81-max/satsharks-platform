"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { homePath, useMe, useSwitchUser } from "@/lib/auth";

const button = "whitespace-nowrap rounded-[6px] bg-brand-500 px-5 py-2 text-[14px] font-bold tracking-tight text-white transition hover:opacity-90";
const textLink = "whitespace-nowrap px-2 text-[14px] font-bold text-slate-600 transition hover:text-black";
// Phone menu rows: full width and at least 44px tall, so they are easy to tap.
const menuRow = "flex min-h-11 items-center rounded-lg px-3 text-[15px] font-bold text-slate-800 hover:bg-slate-100";

export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const switchUser = useSwitchUser();
  const { data: user, isLoading } = useMe();
  const [menuOpen, setMenuOpen] = useState(false);
  // Admin links are shown only when the signed-in account has admin access. The pages and the
  // API check this again; hiding the link is for clarity, not security.
  const isAdmin = user?.permissions.includes("admin:access") ?? false;

  // A tap on a menu link navigates; the menu then closes by itself.
  useEffect(() => setMenuOpen(false), [pathname]);

  async function logout() {
    setMenuOpen(false);
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    switchUser(null);
    router.push("/");
  }

  // Admin and staff accounts manage the site and do not practise, so they only get the portal.
  const links = user
    ? isAdmin
      ? [{ href: "/admin", label: "Admin Portal" }]
      : [
          { href: "/dashboard", label: "Home" },
          { href: "/practice", label: "Review" },
        ]
    : [{ href: "/pricing", label: "Pricing" }];

  return (
    <header className="relative border-b border-slate-900 bg-white">
      <nav className="mx-auto flex w-full max-w-[1700px] items-center gap-4 px-4 py-3 md:px-8">
        <Link href={user ? homePath(user) : "/"} className="mr-auto text-[24px] font-bold tracking-tight text-brand-500 sm:text-[28px]">
          SAT Sharks
        </Link>

        {/* Tablets and up: the full row. */}
        {user && (
          <div className="hidden items-center gap-4 sm:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={button}>
                {link.label}
              </Link>
            ))}
            <span aria-hidden className="mx-1 h-6 w-px bg-slate-400" />
            <button type="button" onClick={logout} className={`${button} cursor-pointer`}>
              Sign Out
            </button>
          </div>
        )}
        {!user && !isLoading && (
          <div className="hidden items-center gap-4 sm:flex">
            <Link href="/pricing" className={textLink}>
              Pricing
            </Link>
            <Link href="/login" className={textLink}>
              Log In
            </Link>
            <Link href="/register" className={button}>
              Sign Up
            </Link>
          </div>
        )}

        {/* Phones: Sign Up stays visible for visitors; everything else is in the menu. */}
        {!user && !isLoading && (
          <Link href="/register" className={`${button} px-4 sm:hidden`}>
            Sign Up
          </Link>
        )}
        {!isLoading && (
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-50 sm:hidden"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        )}
      </nav>

      {menuOpen && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full z-40 border-b border-slate-900 bg-white px-4 pb-4 pt-2 shadow-lg sm:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={`${menuRow} ${pathname === link.href ? "bg-brand-50 text-brand-700" : ""}`}>
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/pricing" className={menuRow}>
                  Pricing
                </Link>
                <div className="my-1 border-t border-slate-200" />
                <p className="truncate px-3 text-xs text-slate-500">Signed in as {user.email}</p>
                <button type="button" onClick={logout} className={`${menuRow} cursor-pointer text-left`}>
                  Sign Out
                </button>
              </>
            ) : (
              <Link href="/login" className={menuRow}>
                Log In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
