import { useQuery } from "@tanstack/react-query";
import type { SatDatesContent, SatTestDate } from "@satsharks/types";
import { api } from "./api";

export const SAT_DATES_QUERY_KEY = ["sat-dates"] as const;

// Test dates and deadlines, as set in Admin → SAT dates. Public.
export function useSatDates() {
  return useQuery({ queryKey: SAT_DATES_QUERY_KEY, queryFn: () => api<SatDatesContent>("/api/sat-dates"), staleTime: 5 * 60_000 });
}

// Midnight at the start of a "YYYY-MM-DD" day in the viewer's own time zone.
export function startOfDay(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year!, month! - 1, date!);
}

// A day still counts until it has ended where the viewer is.
const hasEnded = (day: string, now: Date) => startOfDay(day).getTime() + 24 * 3_600_000 <= now.getTime();

// Test days that have not ended yet, in date order.
export function upcomingSatDates(dates: SatTestDate[], now: Date): SatTestDate[] {
  return dates.filter((entry) => !hasEnded(entry.date, now)).sort((a, b) => a.date.localeCompare(b.date));
}

// Where registration for a test day stands now.
export function registrationStatus(entry: SatTestDate, now: Date): "open" | "late" | "closed" {
  if (!hasEnded(entry.registrationDeadline, now)) return "open";
  if (entry.lateDeadline && !hasEnded(entry.lateDeadline, now)) return "late";
  return "closed";
}

// "Sat, Nov 7, 2026" (style "short") or "Saturday, November 7, 2026" ("long"). Read as UTC so the
// day never shifts with the viewer's time zone.
export function formatDay(day: string, style: "short" | "long" = "short"): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: style,
    month: style,
    day: "numeric",
    year: "numeric",
  });
}
