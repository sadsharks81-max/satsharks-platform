"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PublicUser } from "@satsharks/types";
import { api, ApiError } from "./api";

export const ME_QUERY_KEY = ["auth", "me"] as const;

// null = signed out. Any other failure (API down, 5xx) surfaces as an error instead of
// being mistaken for "signed out".
async function fetchMe(): Promise<PublicUser | null> {
  try {
    return (await api<{ user: PublicUser }>("/api/auth/me")).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function useMe() {
  return useQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe, staleTime: 60_000, retry: false });
}

export function useSetMe() {
  const queryClient = useQueryClient();
  return (user: PublicUser | null) => queryClient.setQueryData(ME_QUERY_KEY, user);
}
