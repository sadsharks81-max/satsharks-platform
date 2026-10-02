"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { PublicUser } from "@satsharks/types";
import { api } from "@/lib/api";
import { useSetMe } from "@/lib/auth";
import { Card, Notice } from "./ui";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

// Only same-site paths are accepted, so ?next= cannot be used to send someone to another website.
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setMe = useSetMe();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const { user } = await api<{ user: PublicUser }>(`/api/auth/${mode}`, {
        method: "POST",
        body: {
          ...(isRegister ? { name: form.get("name") } : {}),
          email: form.get("email"),
          password: form.get("password"),
        },
      });
      setMe(user);
      router.push(safeNext(searchParams.get("next")));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto mt-6 w-full max-w-sm">
      <h1 className="text-center text-xl font-bold">{isRegister ? "Create your account" : "Log in"}</h1>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        {isRegister && (
          <label className="block text-sm font-medium">
            Name
            <input name="name" required minLength={2} maxLength={80} autoComplete="name" className={inputClass} />
          </label>
        )}
        <label className="block text-sm font-medium">
          Email address
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={isRegister ? 8 : 1}
            maxLength={72}
            autoComplete={isRegister ? "new-password" : "current-password"}
            className={inputClass}
          />
          {isRegister && <span className="mt-1 block text-xs font-normal text-slate-500">At least 8 characters.</span>}
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full cursor-pointer rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Please wait…" : isRegister ? "Sign up" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        {isRegister ? "Already have an account? " : "Don't have an account? "}
        <Link href={isRegister ? "/login" : "/register"} className="font-medium text-brand-500 hover:underline">
          {isRegister ? "Log in" : "Sign up"}
        </Link>
      </p>
    </Card>
  );
}
