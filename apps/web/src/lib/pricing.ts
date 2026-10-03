// Plans and limits as written in the project proposal (v4.0, "Subscription plans" and "Free vs
// paid"). The proposal calls these prices a starting suggestion that SAT Sharks confirms before
// payments go live; change them here and every page follows.

export type Currency = "PKR" | "USD";

export interface Plan {
  id: "free" | "monthly" | "three_months" | "till_test_day";
  name: string;
  price: Record<Currency, string>;
  period: string;
  // "Save 22%" etc., per currency (the proposal's figures differ slightly between the two).
  saving: Record<Currency, string> | null;
  highlights: string[];
  popular: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: { PKR: "PKR 0", USD: "$0" },
    period: "forever",
    saving: null,
    highlights: ["2 full papers", "20 drill questions a day", "Score only, no analysis"],
    popular: false,
  },
  {
    id: "monthly",
    name: "Monthly",
    price: { PKR: "PKR 1,500", USD: "$12.99" },
    period: "per month",
    saving: null,
    highlights: ["Everything unlocked", "Cancel any time"],
    popular: false,
  },
  {
    id: "three_months",
    name: "3 Months",
    price: { PKR: "PKR 3,500", USD: "$29.99" },
    period: "per 3 months",
    saving: { PKR: "Save 22%", USD: "Save 23%" },
    highlights: ["Everything unlocked", "The normal prep window"],
    popular: true,
  },
  {
    id: "till_test_day",
    name: "Till Test Day",
    price: { PKR: "PKR 5,999", USD: "$49.99" },
    period: "per 6 months",
    saving: { PKR: "Save 33%", USD: "Save 36%" },
    highlights: ["Everything unlocked", "Covers the full run-up to the exam"],
    popular: false,
  },
];

export const COMPARISON: { feature: string; free: string; paid: string }[] = [
  { feature: "Full-length past papers", free: "2", paid: "Every paper, plus each new one" },
  { feature: "Drill questions", free: "20 per day", paid: "Unlimited" },
  { feature: "Question review with explanations", free: "Yes", paid: "Yes" },
  { feature: "Predicted SAT score", free: "Score only", paid: "Score, range and trend" },
  { feature: "Skills breakdown", free: "Top 3 weak areas", paid: "All topics and skills" },
  { feature: "Error pattern and timing analysis", free: "—", paid: "Yes" },
  { feature: "Mistake bank and retry queue", free: "Last 20 questions", paid: "Unlimited" },
  { feature: "Daily goals, streaks and leaderboard", free: "Yes", paid: "Yes" },
  { feature: "Streak freezes", free: "1 per month", paid: "3 per month" },
];
