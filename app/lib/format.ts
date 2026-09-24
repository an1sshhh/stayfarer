/** Shared display helpers — safe to import from server and client components. */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
}

export function inr(amount: number | string | null | undefined, opts: { decimals?: boolean } = {}): string {
  const n = Number(amount ?? 0);
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: opts.decimals && n % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  })}`;
}

/** Local-calendar ISO date (YYYY-MM-DD); avoids the UTC shift of toISOString(). */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(value: string, days: number): string {
  const d = parseISO(value);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return isoDate(d);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(1, Math.round((parseISO(checkOut).getTime() - parseISO(checkIn).getTime()) / 86400000));
}

/** "Sat, 10 Oct" */
export function shortDate(value: string): string {
  return parseISO(value).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** "10 Oct 2026" */
export function longDate(value: string): string {
  return parseISO(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function isValidISO(value: string | undefined | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime());
}

const MEALS: Record<string, string> = {
  no_meals: "Room only",
  breakfast: "Breakfast included",
  lunch: "Lunch included",
  dinner: "Dinner included",
  breakfast_lunch: "Breakfast + lunch",
  breakfast_dinner: "Breakfast + dinner",
  all_meals: "All meals included",
};

export function mealLabel(value: string | null | undefined): string {
  return MEALS[value ?? ""] ?? "Room only";
}

export function titleCase(value: string | null | undefined): string {
  return (value ?? "").replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Review score (0–10) to the word OTAs print beside it. */
export function scoreLabel(score: number): string {
  if (score >= 9) return "Exceptional";
  if (score >= 8) return "Excellent";
  if (score >= 7) return "Very good";
  if (score >= 6) return "Good";
  return "Pleasant";
}

/**
 * Summarises a rate plan's cancellation slabs against a check-in date, e.g.
 * "Free cancellation till 3 Oct". Slabs mean "cancel at least N days before
 * check-in to get P% back".
 */
export function cancellationSummary(
  refundable: boolean,
  slabs: { days_before_checkin: number; refund_percent: number }[],
  checkIn?: string
): { free: boolean; text: string } {
  if (!refundable) return { free: false, text: "Non-refundable" };
  const full = [...slabs].filter((s) => s.refund_percent >= 100).sort((a, b) => a.days_before_checkin - b.days_before_checkin)[0];
  if (!slabs.length) return { free: true, text: "Free cancellation" };
  if (!full) return { free: false, text: "Partially refundable" };
  if (!checkIn) {
    return { free: true, text: full.days_before_checkin > 0 ? `Free cancellation up to ${full.days_before_checkin} days before check-in` : "Free cancellation" };
  }
  const deadline = addDays(checkIn, -full.days_before_checkin);
  if (deadline < todayISO()) return { free: false, text: "Free cancellation period has passed" };
  return { free: true, text: `Free cancellation till ${longDate(deadline)}` };
}
