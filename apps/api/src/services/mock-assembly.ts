// Builds the modules of an adaptive mock from a pool of published questions.
//
// Every module is spread across the section's skills: one question per skill in turn, until
// the module is full. That is how the observed source mocks are built (each Math module covered
// nearly every skill once). On top of that, each module prefers a difficulty:
//   Module 1          — no preference
//   Module 2 (harder) — hard first, then medium, then unlabelled, then easy
//   Module 2 (easier) — easy first, then medium, then unlabelled, then hard
// The preference only decides the order within each skill; a module is never short of
// questions because a difficulty is missing.
import type { Difficulty, MockModule, Section } from "@satsharks/types";

export interface Candidate {
  id: string;
  skill: string | null;
  topic: string | null;
  difficulty: Difficulty | null;
}

const RANK: Record<"m2_easy" | "m2_hard", Record<string, number>> = {
  m2_hard: { hard: 0, medium: 1, none: 2, easy: 3 },
  m2_easy: { easy: 0, medium: 1, none: 2, hard: 3 },
};

// Reading & Writing modules follow the official order of domains.
const RW_DOMAIN_ORDER = ["Craft and Structure", "Information and Ideas", "Standard English Conventions", "Expression of Ideas"];
const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, none: 1, hard: 2 };

export type Random = () => number;

function shuffle<T>(items: T[], random: Random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function pickModule(
  pool: Candidate[],
  size: number,
  module: MockModule,
  exclude: ReadonlySet<string>,
  random: Random = Math.random,
): Candidate[] {
  const bySkill = new Map<string, Candidate[]>();
  for (const candidate of pool) {
    if (exclude.has(candidate.id)) continue;
    const key = candidate.skill ?? "(no skill)";
    bySkill.set(key, [...(bySkill.get(key) ?? []), candidate]);
  }

  const rank = module === "m1" ? null : RANK[module];
  // Random order within a skill, then (for Module 2) the preferred difficulty first.
  const queues = shuffle([...bySkill.values()], random).map((group) => {
    const shuffled = shuffle(group, random);
    return rank ? shuffled.sort((a, b) => rank[a.difficulty ?? "none"]! - rank[b.difficulty ?? "none"]!) : shuffled;
  });

  const picked: Candidate[] = [];
  while (picked.length < size && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      if (picked.length >= size) break;
      const next = queue.shift();
      if (next) picked.push(next);
    }
  }
  return picked;
}

// Order of questions inside a module: Reading & Writing by domain, Math from easier to harder.
export function orderModule(questions: Candidate[], section: Section): Candidate[] {
  const difficulty = (candidate: Candidate) => DIFFICULTY_ORDER[candidate.difficulty ?? "none"]!;
  if (section === "math") return [...questions].sort((a, b) => difficulty(a) - difficulty(b));
  const domain = (candidate: Candidate) => {
    const index = RW_DOMAIN_ORDER.indexOf(candidate.topic ?? "");
    return index < 0 ? RW_DOMAIN_ORDER.length : index;
  };
  return [...questions].sort((a, b) => domain(a) - domain(b) || difficulty(a) - difficulty(b));
}

// Correct answers needed in Module 1 for the harder Module 2.
export function requiredForHard(moduleOneSize: number, thresholdPercent: number): number {
  return Math.ceil((moduleOneSize * thresholdPercent) / 100);
}
