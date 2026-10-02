"use client";

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-900 bg-white p-5 ${className}`}>{children}</div>;
}

export function Notice({ tone, children }: { tone: "error" | "info"; children: ReactNode }) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-slate-300 bg-white text-slate-700",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-10 text-sm text-slate-600">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
      {label}…
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" | "green" | "red" | "amber" }) {
  const tones = {
    neutral: "border-slate-900 text-slate-900",
    brand: "border-brand-500 text-brand-500",
    green: "border-green-600 text-green-700",
    red: "border-red-600 text-red-700",
    amber: "border-amber-500 text-amber-700",
  };
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${tones[tone]}`}>{children}</span>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "danger"; size?: "md" | "sm" };

export function Button({ variant = "primary", size = "md", className = "", type = "button", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-brand-500 text-white hover:bg-brand-600",
    outline: "border border-slate-900 bg-white text-slate-900 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes = { md: "px-5 py-2.5 text-sm", sm: "px-3 py-1.5 text-xs" };
  return (
    <button
      type={type}
      className={`cursor-pointer rounded-lg font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

// Selectable pill used for filters and option groups.
export function Toggle({ active, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`cursor-pointer rounded-lg border px-3 py-2 text-left text-sm font-bold transition-colors ${
        active ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      } ${className}`}
      {...props}
    />
  );
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-full w-full flex-col rounded-2xl border border-slate-900 bg-white ${wide ? "max-w-5xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between border-b border-slate-900 px-6 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer rounded p-1 text-xl leading-none text-slate-600 hover:bg-slate-100">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
