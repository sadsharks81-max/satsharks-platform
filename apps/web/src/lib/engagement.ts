"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AttemptSummary, DrillSuggestion, EngagementSummary, PublicUser } from "@satsharks/types";
import { api } from "./api";

export const ENGAGEMENT_QUERY_KEY = ["student", "engagement"] as const;

// Goal, streak, points and the due-mistake count. Shared by the sidebar, dashboard and goals page.
export function useEngagement() {
  return useQuery({ queryKey: ENGAGEMENT_QUERY_KEY, queryFn: () => api<EngagementSummary>("/api/student/engagement"), staleTime: 30_000 });
}

// Days, streaks and reminders follow the student's own clock: the browser's time zone is saved
// once per visit when it differs from the account's. Students only.
export function useTimeZoneSync(user: PublicUser | null | undefined) {
  const queryClient = useQueryClient();
  const sent = useRef(false);
  useEffect(() => {
    if (!user || user.role !== "student" || sent.current) return;
    let zone: string;
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!zone || zone === user.timeZone) return;
    sent.current = true;
    void api("/api/student/engagement", { method: "PATCH", body: { timeZone: zone } })
      .then(() => queryClient.invalidateQueries({ queryKey: ENGAGEMENT_QUERY_KEY }))
      .catch(() => undefined);
  }, [user, queryClient]);
}

// Starts a recommended drill (analytics "practise it" buttons) and opens the test screen.
export function useStartDrill() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(drill: DrillSuggestion) {
    setBusy(drill.label);
    setError(null);
    try {
      const { attempt } = await api<{ attempt: AttemptSummary }>("/api/practice/drills/bank", {
        method: "POST",
        body: { section: drill.section, skills: drill.skills, difficulty: drill.difficulty, count: drill.count, timed: drill.timed },
      });
      await queryClient.invalidateQueries({ queryKey: ["practice", "attempts"] });
      router.push(`/practice/${attempt.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the drill");
      setBusy(null);
    }
  }

  return { start, busy, error };
}

// Retry the due mistakes of one section.
export function useStartRetry() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(section: AttemptSummary["section"]) {
    setBusy(true);
    setError(null);
    try {
      const { attempt } = await api<{ attempt: AttemptSummary }>("/api/practice/drills/retry", { method: "POST", body: { section } });
      await queryClient.invalidateQueries({ queryKey: ["practice", "attempts"] });
      router.push(`/practice/${attempt.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the retry");
      setBusy(false);
    }
  }

  return { start, busy, error };
}
