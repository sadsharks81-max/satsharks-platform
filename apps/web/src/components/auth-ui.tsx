"use client";

import Link from "next/link";
import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Logo } from "./logo";

// Shared building blocks for the sign-in, sign-up and password pages.

const POINTS = [
  { title: "Real past papers", text: "Digital SAT questions sorted by section, topic, skill and difficulty." },
  { title: "Adaptive mocks", text: "Module 2 gets harder or easier from your Module 1 result, as on test day." },
  { title: "Review every answer", text: "See the correct answer and the time you spent on each question." },
];

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl py-2 sm:py-6">
      <div className="grid overflow-hidden rounded-2xl border border-slate-900 bg-white lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden flex-col justify-between gap-10 overflow-hidden bg-brand-500 p-10 text-white lg:flex">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5" />
          <div className="relative">
            <Link href="/" className="inline-block text-white">
              <Logo className="h-14 w-auto" />
            </Link>
            <p className="mt-6 text-[28px] font-bold leading-tight tracking-tight">Practise the Digital SAT the way it is really taken.</p>
          </div>
          <ul className="relative space-y-5">
            {POINTS.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span aria-hidden className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white text-xs font-black text-brand-500">
                  ✓
                </span>
                <span>
                  <span className="block font-bold">{point.title}</span>
                  <span className="text-sm text-white/80">{point.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>
        <div className="px-5 py-8 sm:px-10 sm:py-10">
          <div className="mx-auto w-full max-w-md">
            <h1 className="text-[26px] font-bold tracking-tight sm:text-[28px]">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-slate-600">{subtitle}</p>}
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-7 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const control = (invalid: boolean) =>
  `block h-12 w-full rounded-lg border bg-white px-3.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 disabled:bg-slate-50 ${
    invalid ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-slate-300 hover:border-slate-400 focus:border-brand-500 focus:ring-brand-500/20"
  }`;

function FieldShell({ id, label, error, hint, action, children }: { id: string; label: string; error?: string | null; hint?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-bold text-slate-800">
          {label}
        </label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] font-medium text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null; hint?: ReactNode; action?: ReactNode };

export function TextField({ label, error, hint, action, className = "", ...props }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} action={action}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${control(!!error)} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

export function PasswordField({ label, error, hint, action, ...props }: Omit<TextFieldProps, "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} action={action}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${control(!!error)} pr-12`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-r-lg text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {visible ? (
              <>
                <path d="M3 3l18 18" />
                <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 7 9.5 7a9.8 9.8 0 0 0 5.4-1.6" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
              </>
            ) : (
              <>
                <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
    </FieldShell>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string | null; hint?: ReactNode };

export function SelectField({ label, error, hint, children, ...props }: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${control(!!error)} cursor-pointer appearance-none pr-10`}
          {...props}
        >
          {children}
        </select>
        <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="currentColor">
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
        </svg>
      </div>
    </FieldShell>
  );
}

export function SubmitButton({ loading, loadingLabel, children, disabled }: { loading: boolean; loadingLabel: string; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-500 text-[15px] font-bold text-white transition hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {loading ? loadingLabel : children}
    </button>
  );
}

export function FormAlert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}
    >
      {children}
    </div>
  );
}

export const authLink = "font-bold text-brand-500 hover:underline";
