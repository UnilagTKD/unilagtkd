import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { MEMBER_PAGE_ROLES } from "@/lib/roles";
import { attendanceHistoryFor, attendanceStatsFor } from "@/lib/attendance-data";
import { getAttendancePeriod, listAttendancePeriods } from "@/lib/attendance-periods";
import { recordIdFromSlug, recordSlug } from "@/lib/record-slug";
import { recordId } from "@/lib/validation/actions";
import { describeAttendance, explainExclusions } from "@/lib/attendance";

export default async function MemberAttendancePage({ searchParams }: { searchParams: Promise<{ period?: string; member?: string }> }) {
  const user = await requireRole([...MEMBER_PAGE_ROLES]);
  const query = await searchParams;
  const userId = user.role === "coach" && query.member ? query.member : user.id;
  if (!recordId.safeParse(userId).success) notFound();
  const id = query.period ? recordIdFromSlug(query.period) : undefined;
  if (query.period && !id) notFound();
  const [period, periods] = await Promise.all([getAttendancePeriod(id ?? undefined), listAttendancePeriods()]);
  if (query.period && !period) notFound();
  const [stats, history] = period ? await Promise.all([attendanceStatsFor(userId, period.id), attendanceHistoryFor(userId, period.id)]) : [null, []];
  const memberQuery = user.role === "coach" && query.member ? `&member=${userId}` : "";
  return <div className="max-w-4xl space-y-6">
    <header><h1 className="text-2xl font-bold">{memberQuery ? "Member attendance review" : "My attendance"}</h1><p className="mt-1 text-sm text-zinc-500">Attendance thresholds use only the current monitoring period. Past batches are saved for review.</p></header>
    {user.role === "coach" && <Link href="/dashboard/coach/attendance" className="text-sm font-medium text-brand-blue">&larr; Attendance periods</Link>}
    <nav aria-label="Choose attendance period" className="flex flex-wrap gap-2"><Link href={`/dashboard/attendance${memberQuery ? `?member=${userId}` : ""}`} className="rounded-full border bg-white px-3 py-2 text-sm">Current period</Link>{periods.map(item => <Link key={item.id} href={`/dashboard/attendance?period=${recordSlug(item.name, item.id)}${memberQuery}`} className="rounded-full border bg-white px-3 py-2 text-sm">{item.name} · {item.closedAt ? "Archived" : "In progress"}</Link>)}</nav>
    <section className="space-y-3 rounded-xl border border-black/10 bg-white p-4 sm:p-6">
      <h2 className="font-semibold">{period?.name ?? "No period in progress"}</h2>
      {period && <p className="text-sm text-zinc-500">{period.startsOn} – {period.endsOn ?? "In progress"}{period.closedAt ? " · Saved archive, read only" : ""}</p>}
      <p className="text-sm">{stats ? describeAttendance(stats) : "No attendance recorded for this member in this period."}</p>
      {stats && explainExclusions(stats) && <p className="text-xs text-zinc-500">{explainExclusions(stats)}</p>}
      <ul className="divide-y divide-zinc-100 text-sm">{history.map(item => <li key={item.sessionId} className="flex flex-wrap justify-between gap-2 py-3"><span>{item.sessionTitle} · {item.sessionDate}</span><span>{item.beforeJoining ? "Excluded: before joining" : item.onLeave ? "Excluded: approved leave" : item.present ? "Present" : "Absent"}</span></li>)}</ul>
      {!history.length && <p className="text-sm text-zinc-500">No session marks in this period.</p>}
    </section>
  </div>;
}
