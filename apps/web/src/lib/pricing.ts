import { useQuery } from "@tanstack/react-query";
import type { PricingContent } from "@satsharks/types";
import { api } from "./api";

export type { Currency } from "@satsharks/types";

export const PRICING_QUERY_KEY = ["pricing"] as const;

// Plans, prices and the payment terms, as set in Admin → Settings. Public.
export function usePricing() {
  return useQuery({ queryKey: PRICING_QUERY_KEY, queryFn: () => api<PricingContent>("/api/pricing"), staleTime: 60_000 });
}
