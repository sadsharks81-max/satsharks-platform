// Pure rules for payments and plans (unit-tested in test/payment-rules.test.ts).
import { REFERRAL_MAX_REWARDS, REFERRALS_PER_REWARD, type Currency } from "@satsharks/types";

// `months` calendar months after `date`; the 31st of a shorter month becomes its last day.
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export const addDaysTo = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

export interface CurrentPlan {
  plan: "free" | "paid";
  planExpiresAt: Date | null;
}

// The period a new payment pays for. Paying while a plan is still running adds the time after its
// end (renewing early loses nothing). A paid plan with no end date (given by an admin) stays without
// one: end = null.
export function periodFor(current: CurrentPlan, months: number, now: Date): { start: Date; end: Date | null } {
  if (current.plan === "paid" && current.planExpiresAt === null) return { start: now, end: null };
  const running = current.plan === "paid" && current.planExpiresAt !== null && current.planExpiresAt.getTime() > now.getTime();
  const start = running ? current.planExpiresAt! : now;
  return { start, end: addMonths(start, months) };
}

// The same, for a number of days (friend-invite weeks).
export function extendByDays(current: CurrentPlan, days: number, now: Date): Date | null {
  if (current.plan === "paid" && current.planExpiresAt === null) return null;
  const running = current.plan === "paid" && current.planExpiresAt !== null && current.planExpiresAt.getTime() > now.getTime();
  return addDaysTo(running ? current.planExpiresAt! : now, days);
}

// Rupees are charged in whole rupees, dollars in cents.
export function discounted(amount: number, percentOff: number, currency: Currency): number {
  const value = amount * (1 - percentOff / 100);
  return currency === "PKR" ? Math.round(value) : Math.round(value * 100) / 100;
}

// "SS-20261019-4F2A9C": the paid day and the end of the payment's id, unique and easy to read out.
export function receiptNumber(paymentId: string, paidAt: Date): string {
  return `SS-${paidAt.toISOString().slice(0, 10).replace(/-/g, "")}-${paymentId.slice(-6).toUpperCase()}`;
}

// Free weeks still owed to an inviter with `qualified` friends who have practised.
export function referralRewardsDue(qualified: number, given: number): number {
  return Math.max(0, Math.min(REFERRAL_MAX_REWARDS, Math.floor(qualified / REFERRALS_PER_REWARD)) - given);
}

// Escapes a value for one CSV cell; a leading = + - @ is neutralised so spreadsheets do not run it.
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
