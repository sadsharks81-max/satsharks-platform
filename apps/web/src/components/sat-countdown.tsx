"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDay, registrationStatus, startOfDay, upcomingSatDates, useSatDates } from "@/lib/sat-dates";

const UNITS = [
  { label: "Days", seconds: 86_400, modulo: Infinity },
  { label: "Hours", seconds: 3_600, modulo: 24 },
  { label: "Minutes", seconds: 60, modulo: 60 },
  { label: "Seconds", seconds: 1, modulo: 60 },
] as const;

// Ticks once a second. Starts as null so nothing time-dependent is rendered before mount.
function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

// The dashboard's banner: time left until the next SAT (midnight at the start of test day, in the
// student's own time zone), with where registration stands. It moves on to the next date by itself
// once a test day is over, and hides when no upcoming date is set in Admin → SAT dates.
export function SatCountdown() {
  const satDates = useSatDates();
  const now = useNow();
  if (!now || !satDates.data) return null;
  const next = upcomingSatDates(satDates.data.dates, now)[0];
  if (!next) return null;

  const left = Math.max(0, Math.floor((startOfDay(next.date).getTime() - now.getTime()) / 1000));
  const status = registrationStatus(next, now);
  const registration =
    status === "open"
      ? `Register by ${formatDay(next.registrationDeadline)}`
      : status === "late"
        ? `Late registration until ${formatDay(next.lateDeadline!)}`
        : "Registration for this date has closed";

  return (
    <section aria-label="Next SAT" className="flex flex-col gap-5 rounded-2xl bg-brand-500 px-5 py-5 text-white sm:px-8 md:flex-row md:items-center md:justify-between md:py-6 lg:px-12">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/75">Next SAT</p>
        <h2 className="mt-1 text-[24px] font-bold tracking-tight sm:text-[30px]">{formatDay(next.date)}</h2>
        <p className="mt-1 text-sm font-medium text-white/85">
          {registration} ·{" "}
          <Link href="/sat-dates" className="font-bold text-white underline-offset-2 hover:underline">
            All dates &amp; deadlines
          </Link>
        </p>
      </div>
      {left > 0 ? (
        <div className="flex gap-2.5 sm:gap-4" role="timer" aria-label={`${Math.floor(left / 86_400)} days left`}>
          {UNITS.map((unit) => {
            const value = Math.floor(left / unit.seconds) % unit.modulo;
            return (
              <div key={unit.label} className="flex flex-1 flex-col items-center gap-1.5 md:flex-none">
                <span className="flex h-[64px] w-full min-w-[64px] items-center justify-center rounded-xl bg-white text-[28px] font-bold tabular-nums text-brand-500 sm:h-[90px] sm:w-[90px] sm:text-[36px]">
                  {String(value).padStart(2, "0")}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-white/85 sm:text-xs">{unit.label}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xl font-bold">Today is test day. Good luck!</p>
      )}
    </section>
  );
}
