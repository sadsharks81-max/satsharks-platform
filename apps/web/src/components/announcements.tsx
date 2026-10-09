"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Announcement } from "@satsharks/types";
import { api } from "@/lib/api";
import { isStaffUser, useMe } from "@/lib/auth";

// Dismissed announcements, kept in this browser only. An edited announcement shows again.
const DISMISSED_KEY = "satsharks.dismissed";
const dismissKey = (announcement: Announcement) => `${announcement.id}:${announcement.updatedAt}`;

function readDismissed(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

const TONES = {
  info: "border-brand-500 bg-brand-50 text-slate-800",
  important: "border-amber-500 bg-amber-50 text-amber-950",
};

export function AnnouncementCard({ announcement, onDismiss }: { announcement: Announcement; onDismiss?: () => void }) {
  return (
    <div role="status" className={`flex items-start gap-3 rounded-xl border-l-4 border px-4 py-3 ${TONES[announcement.tone]}`}>
      <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11v3a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zm13-3a5 5 0 0 1 0 8m2.5-10.5a8.5 8.5 0 0 1 0 13" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{announcement.title}</p>
        <p className="mt-0.5 whitespace-pre-line break-words text-sm">{announcement.message}</p>
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss announcement" className="-mr-1 cursor-pointer rounded p-1 leading-none text-slate-500 hover:bg-black/5 hover:text-black">
          ✕
        </button>
      )}
    </div>
  );
}

// Banners for the signed-in student. Admins and staff write them instead (Admin → Announcements).
export function Announcements() {
  const { data: user } = useMe();
  const student = !!user && !isStaffUser(user);
  const query = useQuery({
    queryKey: ["announcements"],
    queryFn: () => api<{ announcements: Announcement[] }>("/api/announcements"),
    enabled: student,
    staleTime: 60_000,
  });
  // Read after mount, so the server render and the first client render match.
  const [dismissed, setDismissed] = useState<string[] | null>(null);
  useEffect(() => setDismissed(readDismissed()), []);

  if (!student || dismissed === null) return null;
  const shown = (query.data?.announcements ?? []).filter((announcement) => !dismissed.includes(dismissKey(announcement)));
  if (shown.length === 0) return null;

  function dismiss(announcement: Announcement) {
    // Only keep entries for announcements that still exist, so the list does not grow forever.
    const current = new Set((query.data?.announcements ?? []).map(dismissKey));
    const next = [...dismissed!.filter((key) => current.has(key)), dismissKey(announcement)];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: dismissed for this visit only.
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      {shown.map((announcement) => (
        <AnnouncementCard key={announcement.id} announcement={announcement} onDismiss={() => dismiss(announcement)} />
      ))}
    </div>
  );
}
