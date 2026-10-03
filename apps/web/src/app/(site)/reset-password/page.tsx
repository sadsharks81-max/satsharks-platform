"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthShell, FormAlert, PasswordField, SubmitButton, authLink } from "@/components/auth-ui";
import { Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useSwitchUser } from "@/lib/auth";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function ExpiredLink() {
  return (
    <div className="space-y-5">
      <FormAlert tone="error">This reset link is invalid or has expired. Links work once and last 30 minutes.</FormAlert>
      <Link
        href="/forgot-password"
        className="flex h-12 w-full items-center justify-center rounded-lg bg-brand-500 text-[15px] font-bold text-white transition hover:bg-brand-600"
      >
        Request a new link
      </Link>
    </div>
  );
}

function ResetForm() {
  const router = useRouter();
  const switchUser = useSwitchUser();
  const token = useSearchParams().get("token") ?? "";
  const wellFormed = TOKEN_PATTERN.test(token);
  const check = useQuery({
    queryKey: ["auth", "reset-token", token],
    queryFn: () => api<{ valid: boolean }>("/api/auth/reset-password/check", { method: "POST", body: { token } }),
    enabled: wellFormed,
    retry: false,
    staleTime: Infinity,
  });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: typeof errors = {};
    if (password.length < 8) found.password = "Use at least 8 characters.";
    else if (password.length > 72) found.password = "Use at most 72 characters.";
    if (confirm !== password) found.confirm = "The two passwords do not match.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await api("/api/auth/reset-password", { method: "POST", body: { token, password } });
      // The server signed out every session; make this tab agree before showing the login page.
      switchUser(null);
      router.replace("/login?reset=1");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (!wellFormed || check.data?.valid === false) return <ExpiredLink />;
  if (check.isLoading) return <Spinner label="Checking your link" />;
  if (check.error) return <FormAlert tone="error">{check.error.message}</FormAlert>;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && <FormAlert tone="error">{formError}</FormAlert>}
      <PasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        maxLength={72}
        placeholder="At least 8 characters"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password}
        hint="At least 8 characters."
      />
      <PasswordField
        label="Confirm new password"
        name="confirm"
        autoComplete="new-password"
        maxLength={72}
        placeholder="Type it again"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        error={errors.confirm}
      />
      <SubmitButton loading={submitting} loadingLabel="Saving…">
        Set new password
      </SubmitButton>
      <p className="text-center text-[13px] text-slate-500">You will be signed out everywhere and asked to log in with the new password.</p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      footer={
        <Link href="/login" className={authLink}>
          ← Back to log in
        </Link>
      }
    >
      {/* useSearchParams needs a Suspense boundary to be prerendered. */}
      <Suspense fallback={<Spinner label="Loading" />}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
