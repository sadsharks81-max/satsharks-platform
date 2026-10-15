"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Leaderboard, LeaderboardPeriod, LeaderboardRow, LeaderboardScope } from "@satsharks/types";
import { Button, Card, Notice, PageHeader, Spinner, Toggle } from "@/components/ui";
import { api } from "@/lib/api";
import { countryOptions } from "@/lib/countries";
import { useEngagement } from "@/lib/engagement";

const SCOPES: { id: LeaderboardScope; label: string }[] = [
  { id: "global", label: "Global" },
  { id: "country", label: "My country" },
  { id: "friends", label: "Friends" },
];
const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "all", label: "All time" },
];

// "PK" → 🇵🇰 (regional indicator letters).
const flag = (code: string | null) => (code && /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65)) : "");

function Row({ row }: { row: LeaderboardRow }) {
  return (
    <tr className={row.me ? "bg-brand-50 font-bold" : ""}>
      <td className="px-4 py-3 tabular-nums">{row.rank <= 3 ? ["🥇", "🥈", "🥉"][row.rank - 1] : row.rank}</td>
      <td className="px-4 py-3">
        <span className="mr-2" aria-hidden>
          {flag(row.country)}
        </span>
        {row.name}
        {row.me && <span className="ml-2 text-xs font-bold text-brand-600">(you)</span>}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{row.streak > 0 ? `${row.streak} d` : "–"}</td>
      <td className="px-4 py-3 text-right font-bold tabular-nums">{row.points.toLocaleString()}</td>
    </tr>
  );
}

// Accounts made before sign-up asked for a country have none: they choose it once to get a country board.
function ChooseCountry() {
  const queryClient = useQueryClient();
  // Built after mount: country names differ between Node and the browser (hydration).
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);
  useEffect(() => setCountries(countryOptions()), []);
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/student/country", { method: "PUT", body: { country } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["student", "leaderboard"] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your country");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 py-6 text-sm">
      <p className="text-slate-700">Your account has no country yet. Choose it to see the leaderboard for students from your country.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          aria-label="Your country"
          className="h-10 w-64 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Choose your country</option>
          {countries.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.name}
            </option>
          ))}
        </select>
        <Button disabled={busy || !country} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
      {error && (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </div>
  );
}

function Friends({ board }: { board: Leaderboard }) {
  const queryClient = useQueryClient();
  const engagement = useEngagement();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setMessage(null);
    try {
      setMessage({ tone: "info", text: await action() });
      await queryClient.invalidateQueries({ queryKey: ["student", "leaderboard"] });
    } catch (caught) {
      setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  }

  const myCode = engagement.data?.friendCode;
  return (
    <Card>
      <h2 className="font-bold">Friends</h2>
      <p className="mt-1 text-sm text-slate-600">Practise with friends and compete on the Friends board. Adding a friend adds you to theirs too.</p>
      {myCode && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          Your friend code:
          <code className="rounded-lg border border-slate-900 bg-slate-50 px-3 py-1 font-mono text-base font-bold tracking-widest">{myCode}</code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void navigator.clipboard?.writeText(myCode).then(() => setCopied(true));
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            const { friend } = await api<{ friend: { name: string } }>("/api/student/friends", { method: "POST", body: { code } });
            setCode("");
            return `${friend.name} is now your friend.`;
          });
        }}
      >
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Friend's code"
          maxLength={10}
          aria-label="Friend's code"
          className="h-10 w-44 rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm uppercase tracking-widest outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <Button type="submit" disabled={busy || code.trim().length < 6}>
          Add friend
        </Button>
      </form>
      {message && (
        <div className="mt-3">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
      {board.friends.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-200 text-sm">
          {board.friends.map((friend) => (
            <li key={friend.id} className="flex items-center justify-between py-2">
              {friend.name}
              <Button size="sm" variant="outline" disabled={busy} onClick={() => run(async () => (await api(`/api/student/friends/${friend.id}`, { method: "DELETE" }), `${friend.name} removed.`))}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function LeaderboardPage() {
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const board = useQuery({
    queryKey: ["student", "leaderboard", scope, period],
    queryFn: () => api<Leaderboard>(`/api/student/leaderboard?scope=${scope}&period=${period}`),
  });
  const data = board.data;

  return (
    <>
      <PageHeader title="Leaderboard" subtitle="Ranked on practice points, not scores: everyone can climb by practising well." />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {SCOPES.map((entry) => (
                <Toggle key={entry.id} active={scope === entry.id} onClick={() => setScope(entry.id)} className="py-1.5 text-xs">
                  {entry.label}
                </Toggle>
              ))}
            </div>
            <div className="flex gap-2">
              {PERIODS.map((entry) => (
                <Toggle key={entry.id} active={period === entry.id} onClick={() => setPeriod(entry.id)} className="py-1.5 text-xs">
                  {entry.label}
                </Toggle>
              ))}
            </div>
          </div>
          {board.isLoading && (
            <div className="px-4">
              <Spinner label="Loading the leaderboard" />
            </div>
          )}
          {board.error && (
            <div className="p-4">
              <Notice tone="error">{board.error.message}</Notice>
            </div>
          )}
          {data && scope === "country" && data.country === null && <ChooseCountry />}
          {data && data.rows.length === 0 && !(scope === "country" && data.country === null) && (
            <p className="px-4 py-6 text-sm text-slate-600">
              {scope === "friends" && data.friends.length === 0 ? "Add a friend with their code to start a Friends board." : "No points here yet. Answer some questions to get on the board."}
            </p>
          )}
          {data && data.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="w-16 px-4 py-2">Rank</th>
                    <th className="px-4 py-2">Student</th>
                    <th className="px-4 py-2 text-right">Streak</th>
                    <th className="px-4 py-2 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.rows.map((row) => (
                    <Row key={`${row.rank}-${row.name}`} row={row} />
                  ))}
                  {data.me && (
                    <>
                      <tr aria-hidden>
                        <td colSpan={4} className="px-4 py-1 text-center text-slate-400">
                          ⋯
                        </td>
                      </tr>
                      <Row row={data.me} />
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            Weeks run Monday to Sunday. Names are shown as given at sign-up; to stay off the leaderboard, turn it off on Goals &amp; streaks.
          </p>
        </Card>
        {data && <Friends board={data} />}
      </div>
    </>
  );
}
