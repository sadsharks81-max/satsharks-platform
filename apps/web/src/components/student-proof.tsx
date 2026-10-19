"use client";

import { useProof } from "@/lib/billing";

// Proposal "proof from real students": real improvements and how many students are practising now.
// Only real numbers from the database; nothing is shown until there is something true to show
// (small "practising now" counts are left out rather than padded).
const SHOW_PRACTISING_FROM = 5;

export function StudentProof({ tone = "light" }: { tone?: "light" | "brand" }) {
  const { data } = useProof();
  if (!data) return null;
  const practising = data.practisingNow >= SHOW_PRACTISING_FROM ? data.practisingNow : 0;
  if (practising === 0 && data.improvements.length === 0) return null;
  const muted = tone === "brand" ? "text-white/80" : "text-slate-600";

  return (
    <section aria-label="Real students" className="mx-auto mt-12 max-w-5xl">
      {practising > 0 && (
        <p className={`flex items-center justify-center gap-2 text-sm font-bold ${tone === "brand" ? "text-white" : "text-slate-800"}`}>
          <span aria-hidden className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          {practising} students practising right now
        </p>
      )}
      {data.improvements.length > 0 && (
        <>
          <h2 className={`mt-6 text-center text-2xl font-bold tracking-tight ${tone === "brand" ? "text-white" : ""}`}>Real students, real improvements</h2>
          <p className={`mt-1 text-center text-sm ${muted}`}>First and best full-test scores on SAT Sharks.</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.improvements.map((entry) => (
              <li key={`${entry.name}-${entry.from}-${entry.to}`} className="rounded-2xl border border-slate-900 bg-white p-4 text-slate-900">
                <p className="text-2xl font-black tracking-tight text-green-700">
                  +{entry.to - entry.from} <span className="text-sm font-bold text-slate-600">in {entry.weeks} week{entry.weeks === 1 ? "" : "s"}</span>
                </p>
                <p className="mt-1 text-sm font-bold">{entry.name}</p>
                <p className="text-xs text-slate-500">
                  {entry.from} → {entry.to}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
