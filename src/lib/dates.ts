// Whole-day date helpers shared by the grading and attendance rules.
//
// Postgres `date` columns come back as "YYYY-MM-DD" strings while `timestamp`
// columns come back as Dates, and both get compared against each other all over
// the dashboard. Everything here works in whole calendar days so a comparison
// never slips across a timezone boundary.

/** Calendar day count for a `date` string ("YYYY-MM-DD") or a Date. */
export function dayNumber(value: Date | string): number {
  if (typeof value === "string") {
    const [y, m, d] = value.split("-").map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  }
  return Math.floor(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000
  );
}

/** "YYYY-MM-DD" for a Date, in local calendar terms. */
export function toDateInput(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/** `days` after `from`, as a "YYYY-MM-DD" string. */
export function addDays(from: Date, days: number): string {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return toDateInput(next);
}

/** Whole days from `from` to `to`, negative when `to` is earlier. */
export function daysBetween(from: Date | string, to: Date | string): number {
  return dayNumber(to) - dayNumber(from);
}
