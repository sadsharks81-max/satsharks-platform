"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/lib/auth";
import { api } from "@/lib/api";
import { Modal } from "./ui";

const SHOWN_KEY = "satsharks.exitOffer";
// Phones have no "mouse leaving the window": the offer appears after this long on the page instead.
const PHONE_DELAY_MS = 40_000;

function alreadyShown(): boolean {
  try {
    return localStorage.getItem(SHOWN_KEY) === "1";
  } catch {
    return true;
  }
}

function markShown(): void {
  try {
    localStorage.setItem(SHOWN_KEY, "1");
  } catch {
    // Private mode: the offer may show again next visit; harmless.
  }
}

// Proposal "catch them leaving": a one-time offer when someone is about to leave the pricing page
// without paying. Real: the discount is applied at checkout, once per account (Admin → Settings →
// Payments). Shown once per browser, never to paid accounts or staff.
export function ExitOffer() {
  const { data: user } = useMe();
  const offers = useQuery({ queryKey: ["public", "offers"], queryFn: () => api<{ exitOffer: { percentOff: number; headline: string } | null }>("/api/public/offers"), staleTime: 5 * 60_000 });
  const [open, setOpen] = useState(false);
  const offer = offers.data?.exitOffer ?? null;
  const eligible = !!offer && (!user || (user.role === "student" && user.plan === "free"));

  useEffect(() => {
    if (!eligible || alreadyShown()) return;
    const show = () => {
      if (alreadyShown()) return;
      markShown();
      setOpen(true);
    };
    const onLeave = (event: MouseEvent) => {
      if (event.clientY <= 0 && !event.relatedTarget) show();
    };
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const timer = coarse ? window.setTimeout(show, PHONE_DELAY_MS) : undefined;
    document.addEventListener("mouseout", onLeave);
    return () => {
      document.removeEventListener("mouseout", onLeave);
      if (timer) window.clearTimeout(timer);
    };
  }, [eligible]);

  if (!open || !offer) return null;
  const checkout = "/checkout?plan=three_months&offer=1";
  const href = user ? checkout : `/register?next=${encodeURIComponent(checkout)}`;

  return (
    <Modal title="Before you go" onClose={() => setOpen(false)}>
      <p className="text-2xl font-bold tracking-tight">{offer.headline.replace(/\{percent\}/g, String(offer.percentOff))}</p>
      <p className="mt-2 text-sm text-slate-600">
        One time only: {offer.percentOff}% off any plan, applied at checkout. {user ? "" : "Create your free account first; the offer waits for you at checkout."}
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="cursor-pointer rounded-lg border border-slate-900 px-5 py-2.5 text-sm font-bold hover:bg-slate-100">
          No thanks
        </button>
        <Link href={href} onClick={() => setOpen(false)} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
          Claim {offer.percentOff}% off
        </Link>
      </div>
    </Modal>
  );
}
