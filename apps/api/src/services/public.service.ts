// Real numbers for the public pages (proposal "proof from real students"): how many students are
// practising right now, and real score improvements. Only true figures; students who hide themselves
// from the leaderboard are never shown. Kept in memory for a few minutes.
import { FullTestModel, QuestionLogModel, trusted, UserModel, type FullTestDoc, type UserDoc } from "@satsharks/db";
import type { PublicProof } from "@satsharks/types";

const TTL_MS = 5 * 60_000;
const NOW_WINDOW_MS = 15 * 60_000;
const SHOWN = 6;
let cache: { value: PublicProof; expires: number } | null = null;

// "Ayesha R.", as on the share card.
function publicName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Student";
  return words.length === 1 ? words[0]! : `${words[0]} ${words[words.length - 1]![0]!.toUpperCase()}.`;
}

export const publicService = {
  async proof(now = new Date()): Promise<PublicProof> {
    if (cache && cache.expires > now.getTime()) return cache.value;
    const [active, tests] = await Promise.all([
      QuestionLogModel.distinct("userId", { answeredAt: trusted({ $gte: new Date(now.getTime() - NOW_WINDOW_MS) }) }),
      FullTestModel.find({ completedAt: trusted({ $ne: null }), totalScore: trusted({ $ne: null }), removedAt: null })
        .select("userId totalScore completedAt")
        .sort({ completedAt: 1 })
        .limit(20_000)
        .lean<FullTestDoc[]>(),
    ]);

    // First and best full-test total per student; only gains.
    const byUser = new Map<string, { first: number; firstAt: Date; best: number; bestAt: Date }>();
    for (const test of tests) {
      const key = String(test.userId);
      const score = test.totalScore!;
      const at = test.completedAt!;
      const entry = byUser.get(key);
      if (!entry) byUser.set(key, { first: score, firstAt: at, best: score, bestAt: at });
      else if (score > entry.best) Object.assign(entry, { best: score, bestAt: at });
    }
    const gains = [...byUser.entries()].filter(([, entry]) => entry.best > entry.first).sort((a, b) => b[1].best - b[1].first - (a[1].best - a[1].first));
    const users = await UserModel.find({
      _id: trusted({ $in: gains.slice(0, 50).map(([id]) => id) }),
      role: "student",
      status: "active",
      hidden: trusted({ $ne: true }),
      "engagement.showOnLeaderboard": trusted({ $ne: false }),
    })
      .select("name")
      .lean<UserDoc[]>();
    const names = new Map(users.map((user) => [String(user._id), user.name]));
    const improvements = gains
      .filter(([id]) => names.has(id))
      .slice(0, SHOWN)
      .map(([id, entry]) => ({
        name: publicName(names.get(id)!),
        from: entry.first,
        to: entry.best,
        weeks: Math.max(1, Math.round((entry.bestAt.getTime() - entry.firstAt.getTime()) / (7 * 86_400_000))),
      }));

    // Hidden developer accounts do not count as students practising.
    const practising = active.length ? await UserModel.countDocuments({ _id: trusted({ $in: active }), role: "student", hidden: trusted({ $ne: true }) }) : 0;
    const value: PublicProof = { practisingNow: practising, improvements };
    cache = { value, expires: now.getTime() + TTL_MS };
    return value;
  },
};
