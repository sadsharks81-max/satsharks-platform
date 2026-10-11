"use client";

import { useEffect, useState } from "react";
import type { SatTestDate } from "@satsharks/types";
import { formatDay, registrationStatus, upcomingSatDates, useSatDates } from "@/lib/sat-dates";
import { Notice, Spinner } from "./ui";

const STATUS = {
  open: { label: "Registration open", className: "border-green-600 text-green-700" },
  late: { label: "Late registration", className: "border-amber-500 text-amber-700" },
  closed: { label: "Registration closed", className: "border-slate-400 text-slate-500" },
} as const;

function StatusPill({ entry, now }: { entry: SatTestDate; now: Date }) {
  const status = STATUS[registrationStatus(entry, now)];
  return <span className={`inline-flex whitespace-nowrap rounded-full border bg-white px-2.5 py-0.5 text-xs font-bold ${status.className}`}>{status.label}</span>;
}

// The upcoming SAT dates from Admin → SAT dates: a table from tablets up, cards on phones. Which
// dates are still upcoming depends on today, so the list is drawn after mount.
export function SatDatesList() {
  const satDates = useSatDates();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  if (satDates.isLoading || !now) return <Spinner label="Loading test dates" />;
  if (satDates.error) return <Notice tone="error">{satDates.error.message}</Notice>;
  const dates = upcomingSatDates(satDates.data?.dates ?? [], now);
  if (dates.length === 0) return <Notice tone="info">The next SAT dates have not been announced yet. Check back soon.</Notice>;

  const late = (entry: SatTestDate) => (entry.lateDeadline ? formatDay(entry.lateDeadline) : "Not announced");

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-slate-900 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-900 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-5 py-3">Test date</th>
              <th className="px-5 py-3">Registration deadline</th>
              <th className="px-5 py-3">Late registration &amp; changes</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {dates.map((entry, index) => (
              <tr key={entry.date} className={index === 0 ? "bg-brand-50/60" : ""}>
                <td className="px-5 py-4">
                  <span className="font-bold text-black">{formatDay(entry.date)}</span>
                  {index === 0 && <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white">Next</span>}
                  {entry.note && <span className="mt-0.5 block text-xs text-slate-500">{entry.note}</span>}
                </td>
                <td className="px-5 py-4 font-medium">{formatDay(entry.registrationDeadline)}</td>
                <td className="px-5 py-4 font-medium">{late(entry)}</td>
                <td className="px-5 py-4">
                  <StatusPill entry={entry} now={now} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {dates.map((entry, index) => (
          <li key={entry.date} className={`rounded-2xl border bg-white p-4 ${index === 0 ? "border-brand-500 ring-1 ring-brand-500" : "border-slate-900"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-lg font-bold text-black">{formatDay(entry.date)}</span>
              <StatusPill entry={entry} now={now} />
            </div>
            {entry.note && <p className="mt-0.5 text-xs text-slate-500">{entry.note}</p>}
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs font-bold text-slate-500">Register by</dt>
                <dd className="font-medium">{formatDay(entry.registrationDeadline)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-slate-500">Late registration</dt>
                <dd className="font-medium">{late(entry)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
