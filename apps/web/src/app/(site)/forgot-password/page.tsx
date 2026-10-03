"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthShell, FormAlert, SubmitButton, TextField, authLink } from "@/components/auth-ui";
import { api } from "@/lib/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setError("Enter a valid email address, like name@example.com.");
      return;
    }
    setError(null);
    setFormError(null);
    setSubmitting(true);
    try {
      await api("/api/auth/forgot-password", { method: "POST", body: { email: value } });
      setSentTo(value);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={sentTo ? "Check your email" : "Forgot your password?"}
      subtitle={sentTo ? undefined : "Enter the email you signed up with and we will send you a link to choose a new password."}
      footer={
        <Link href="/login" className={authLink}>
          ← Back to log in
        </Link>
      }
    >
      {sentTo ? (
        <div className="space-y-5">
          {/* The same message whether or not the address has an account: nothing here says which. */}
          <FormAlert tone="success">
            If an account exists for <b>{sentTo}</b>, a password reset link is on its way. The link works once and expires in 30 minutes.
          </FormAlert>
          <p className="text-sm text-slate-600">No email after a few minutes? Check your spam folder, or make sure you typed the address you signed up with.</p>
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="h-12 w-full cursor-pointer rounded-lg border border-slate-900 bg-white text-[15px] font-bold transition hover:bg-slate-50"
          >
            Try another email
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {formError && <FormAlert tone="error">{formError}</FormAlert>}
          <TextField
            label="Email address"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={error}
          />
          <SubmitButton loading={submitting} loadingLabel="Sending…">
            Send reset link
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
