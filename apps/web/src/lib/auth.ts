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
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    staleTime: 30_000,
    retry: false,
    // The session cookie is shared by every tab. Always re-check on return to a tab, however
    // recently it was loaded, in case another tab signed out or signed in as someone else.
    refetchOnWindowFocus: "always",
  });
}

// Call after signing in or out: drops everything cached for the previous account (its drills,
// admin data, and who it was), then records the new one.
export function useSwitchUser() {
  const queryClient = useQueryClient();
  return (user: PublicUser | null) => {
    queryClient.clear();
    queryClient.setQueryData(ME_QUERY_KEY, user);
  };
}
