export function currentLagosMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find(p=>p.type==="year")!.value}-${parts.find(p=>p.type==="month")!.value}`;
}
export function lastReportMonth(now = new Date()) {
  const [year, month] = currentLagosMonth(now).split("-").map(Number);
  return new Date(Date.UTC(year, month-2, 1)).toISOString().slice(0, 7);
}
export function reportPeriod(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Choose a valid report month.");
  const [year, number] = month.split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 10);
  return { month, startDay: `${month}-01`, endDay: nextDay, start: new Date(`${month}-01T00:00:00+01:00`), end: new Date(`${nextDay}T00:00:00+01:00`) };
}
