import { useQuery } from "@tanstack/react-query";
import type { Billing, PublicProof } from "@satsharks/types";
import { api } from "./api";

export const BILLING_QUERY_KEY = ["billing"] as const;

// The signed-in student's plan, payments, friend invites and one-time offer.
export function useBilling(enabled = true) {
  return useQuery({ queryKey: BILLING_QUERY_KEY, queryFn: () => api<Billing>("/api/billing"), staleTime: 30_000, enabled });
}

// Real student numbers for the public pages (cached by the API for a few minutes).
export function useProof() {
  return useQuery({ queryKey: ["public", "proof"], queryFn: () => api<PublicProof>("/api/public/proof"), staleTime: 5 * 60_000 });
}

// "21 Dec 2026".
export const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// Whole days from now until `iso` (0 when it is today or past).
export function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}
