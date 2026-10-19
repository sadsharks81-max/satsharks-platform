"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CONTENT_LABEL_TEXT, type ContentLabel, type LockReason } from "@satsharks/types";
import { api } from "@/lib/api";
import { Button, Notice } from "./ui";

// Shown on exams, tests and ways of practising that are kept for paid plans or for invite codes
// (Admin → Access), and the labels admins put on cards.

function LockIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 11h12v10H6V11zm2 0V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

const pill = "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold";

export function PaidBadge({ reason = "paid" }: { reason?: LockReason }) {
  return (
    <span className={`${pill} border-amber-500 bg-amber-50 text-amber-800`}>
      <LockIcon className="h-3 w-3" />
      {reason === "invite" ? "Invite code" : "Paid"}
    </span>
  );
}

const LABEL_STYLE: Record<ContentLabel, string> = {
  new: "border-green-600 bg-green-50 text-green-700",
  hard: "border-red-600 bg-red-50 text-red-700",
  most_attempted: "border-brand-500 bg-brand-50 text-brand-700",
};

// The card's label (New, Hard, Most attempted), a pin, and "Free" when the account is free and
// other exams are locked (proposal: "keep one or two strong papers free and label them clearly").
export function ContentPills({ label, pinned, free, showFree }: { label: ContentLabel | null; pinned: boolean; free: boolean; showFree: boolean }) {
  if (!label && !pinned && !(free && showFree)) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {pinned && <span className={`${pill} border-slate-900 bg-white text-slate-900`}>Featured</span>}
      {label && <span className={`${pill} ${LABEL_STYLE[label]}`}>{CONTENT_LABEL_TEXT[label]}</span>}
      {free && showFree && <span className={`${pill} border-green-600 bg-white text-green-700`}>Free</span>}
    </span>
  );
}

export function UnlockButton({ label = "Unlock with a paid plan", className = "" }: { label?: string; className?: string }) {
  return (
    <Link
      href="/pricing"
      className={`flex h-[42px] items-center justify-center gap-2 rounded-[10px] border border-brand-500 bg-white px-4 text-[14px] font-bold text-brand-500 hover:bg-brand-50 ${className}`}
    >
      <LockIcon className="h-4 w-4" />
      {label}
    </Link>
  );
}

// What a locked card offers: the pricing page, or (invite-only) the invite-code box on Home.
export function LockedAction({ reason, className = "" }: { reason: LockReason; className?: string }) {
  if (reason === "paid") return <UnlockButton className={className} />;
  return (
    <a
      href="#invite-code"
      className={`flex h-[42px] items-center justify-center gap-2 rounded-[10px] border border-amber-500 bg-white px-4 text-[14px] font-bold text-amber-800 hover:bg-amber-50 ${className}`}
    >
      <LockIcon className="h-4 w-4" />
      Enter invite code
    </a>
  );
}

// Students type the code their school or SAT Sharks gave them; the exam opens at once.
export function InviteCodeBox({ startOpen }: { startOpen: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(startOpen);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  async function redeem() {
    setBusy(true);
    setMessage(null);
    try {
      const { name } = await api<{ name: string }>("/api/student/invite-code", { method: "POST", body: { code: code.trim() } });
      setMessage({ tone: "info", text: `${name} is open to you now.` });
      setCode("");
      await queryClient.invalidateQueries({ queryKey: ["practice"] });
    } catch (caught) {
      setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "That code did not work" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="invite-code" className="scroll-mt-24">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="cursor-pointer text-sm font-bold text-brand-500 hover:underline">
          Have an invite code?
        </button>
      ) : (
        <form
          className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-900 bg-white p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void redeem();
          }}
        >
          <label htmlFor="invite-code-input" className="text-sm font-bold">
            Invite code
          </label>
          <input
            id="invite-code-input"
            value={code}
            maxLength={24}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="e.g. SCHOOL-2026"
            className="h-10 w-48 rounded-lg border border-slate-300 px-3 font-mono text-sm uppercase outline-none focus:border-brand-500"
          />
          <Button type="submit" size="sm" disabled={busy || code.trim().length < 4}>
            {busy ? "Checking…" : "Open"}
          </Button>
          {message && (
            <div className="w-full">
              <Notice tone={message.tone}>{message.text}</Notice>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
