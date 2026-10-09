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

// Admin and staff accounts run the site; they do not take drills or mocks. Their home is the
// admin portal, and the student pages send them there.
export const isStaffUser = (user: PublicUser | null | undefined) => user?.permissions.includes("admin:access") ?? false;

export const homePath = (user: PublicUser | null | undefined) => (isStaffUser(user) ? "/admin" : "/dashboard");

// Where to go after signing in. A ?next= page is used only if it is on this site and suits the
// account: an admin page for a student (or a student page for an admin) would only show "no
// access", so the account's home is used instead.
export function nextPathFor(user: PublicUser, next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return homePath(user);
  const adminPage = next === "/admin" || next.startsWith("/admin/");
  return adminPage === isStaffUser(user) ? next : homePath(user);
}

// Set while the user is signing out on purpose, so pages that need a session do not send them to
// the login form (with a ?next= back to the page they just left) before the sign-out navigation.
// It lasts a few seconds: long enough for the navigation, not for a later visit while signed out.
let signedOutAt = 0;
export const isSigningOut = () => Date.now() - signedOutAt < 5_000;

// The account last seen signed in, kept in this browser so pages can open at once while the session
// is checked again (the API decides on every request; this only picks what to show first). Cleared
// on sign-out or when the server says nobody is signed in.
const REMEMBERED_KEY = "satsharks.me";

export function readRememberedUser(): PublicUser | null {
  try {
    const raw = localStorage.getItem(REMEMBERED_KEY);
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  } catch {
    return null;
  }
}

export function rememberUser(user: PublicUser | null | undefined): void {
  try {
    if (user) localStorage.setItem(REMEMBERED_KEY, JSON.stringify(user));
    else localStorage.removeItem(REMEMBERED_KEY);
  } catch {
    // Storage blocked (private mode, settings): pages simply wait for the check, as before.
  }
}

export function isMeQuery(queryKey: readonly unknown[]): boolean {
  return queryKey[0] === ME_QUERY_KEY[0] && queryKey[1] === ME_QUERY_KEY[1];
}

// Call after signing in or out: drops everything cached for the previous account (its drills,
// admin data), then records the new one. The "me" query itself is updated in place, not removed:
// the nav bar lives in a layout that does not re-render on navigation, and an observer whose
// query was removed keeps showing the old account.
export function useSwitchUser() {
  const queryClient = useQueryClient();
  return (user: PublicUser | null) => {
    signedOutAt = user === null ? Date.now() : 0;
    void queryClient.cancelQueries({ queryKey: ME_QUERY_KEY });
    queryClient.removeQueries({ predicate: (query) => !isMeQuery(query.queryKey) });
    queryClient.setQueryData(ME_QUERY_KEY, user);
  };
}
