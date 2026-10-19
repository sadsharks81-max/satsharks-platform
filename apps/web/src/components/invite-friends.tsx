"use client";

import { useEffect, useState } from "react";
import { REFERRAL_MAX_REWARDS, REFERRAL_QUALIFY_POINTS, REFERRAL_REWARD_DAYS, REFERRALS_PER_REWARD, type Billing } from "@satsharks/types";
import { Button, Card } from "./ui";

// "Invite two friends, get a week of Pro free." The link carries the student's friend code.
export function InviteFriends({ billing }: { billing: Billing }) {
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");
  useEffect(() => setLink(`${window.location.origin}/register?ref=${billing.referrals.code}`), [billing.referrals.code]);
  if (!billing.referrals.enabled) return null;
  const { qualified, joined, rewards } = billing.referrals;
  const towardsNext = qualified % REFERRALS_PER_REWARD;
  const done = rewards >= REFERRAL_MAX_REWARDS;
  const message = `I'm practising for the SAT on SAT Sharks: real past papers, a predicted score and a leaderboard. Join me: ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card>
      <h2 className="font-bold">Invite friends, get a free week</h2>
      <p className="mt-1 text-sm text-slate-600">
        Every {REFERRALS_PER_REWARD} friends who sign up with your link and start practising give you {REFERRAL_REWARD_DAYS} days of the paid plan, free (up to {REFERRAL_MAX_REWARDS}{" "}
        weeks). You become friends at once, so you can race on the Friends leaderboard.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input readOnly value={link} aria-label="Your invite link" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm" onFocus={(event) => event.target.select()} />
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
        >
          Share on WhatsApp
        </a>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <dd className="text-lg font-bold">{joined}</dd>
          <dt className="text-xs text-slate-500">signed up</dt>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <dd className="text-lg font-bold">{qualified}</dd>
          <dt className="text-xs text-slate-500">started practising</dt>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <dd className="text-lg font-bold">
            {rewards} / {REFERRAL_MAX_REWARDS}
          </dd>
          <dt className="text-xs text-slate-500">free weeks earned</dt>
        </div>
      </dl>
      <p className="mt-2 text-xs text-slate-500">
        {done
          ? "You have earned every free week. Thank you for spreading the word!"
          : `${REFERRALS_PER_REWARD - towardsNext} more friend${REFERRALS_PER_REWARD - towardsNext === 1 ? "" : "s"} to your next free week. A friend counts after earning ${REFERRAL_QUALIFY_POINTS} practice points (about five right answers); it can take up to 15 minutes to show.`}
      </p>
    </Card>
  );
}
