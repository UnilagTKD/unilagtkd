export function lagosToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function memberAge(dob: string | null, today = lagosToday()): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [year, month, day] = dob.split("-").map(Number);
  const [currentYear, currentMonth, currentDay] = today.split("-").map(Number);
  const age = currentYear - year - (currentMonth < month || (currentMonth === month && currentDay < day) ? 1 : 0);
  return age < 0 ? null : age;
}
