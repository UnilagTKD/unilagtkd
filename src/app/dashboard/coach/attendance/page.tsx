import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { MEMBER_ROLES } from "@/lib/roles";
import { db } from "@/db";
import { attendancePeriodSnapshots, memberProfiles, users } from "@/db/schema";
import { getActiveAttendancePeriod, getAttendancePeriod, listAttendancePeriods, periodSessions } from "@/lib/attendance-periods";
import { attendanceStatsByUser } from "@/lib/attendance-data";
import { isProvisional } from "@/lib/attendance";
import { ATTENDANCE_THRESHOLDS } from "@/lib/constants";
import { recordIdFromSlug, recordSlug } from "@/lib/record-slug";
import { AttendancePeriodControls } from "./period-controls";

function statusFor(pct: number | null) {
  if (pct === null) return "No data";
  if (pct >= ATTENDANCE_THRESHOLDS.varsityRosterPool) return "Varsity pool";
  if (pct >= ATTENDANCE_THRESHOLDS.promotionalGrading) return "Grading eligible";
  if (pct >= ATTENDANCE_THRESHOLDS.activeMembership) return "Active";
  return "Below threshold";
}
export default async function CoachAttendanceDashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireRole(["coach"]);
  const { period: slug } = await searchParams;
  const id = slug ? recordIdFromSlug(slug) : undefined;
  if (slug && !id) notFound();
  const [active, periods, selected] = await Promise.all([getActiveAttendancePeriod(), listAttendancePeriods(), getAttendancePeriod(id ?? undefined)]);
  if (slug && !selected) notFound();
  const [sessions, liveStats, snapshots, members] = await Promise.all([
    selected ? periodSessions(selected.id) : [],
    selected && !selected.closedAt ? attendanceStatsByUser([...MEMBER_ROLES], selected.id) : new Map(),
    selected?.closedAt ? db.select({
      id: attendancePeriodSnapshots.id, userId: attendancePeriodSnapshots.userId,
      name: attendancePeriodSnapshots.name, beltGrade: attendancePeriodSnapshots.beltGrade, stats: attendancePeriodSnapshots.stats,
    }).from(attendancePeriodSnapshots).where(eq(attendancePeriodSnapshots.periodId, selected.id)) : [],
    selected && !selected.closedAt ? db.select({ id: users.id, name: memberProfiles.fullName, email: users.email, beltGrade: memberProfiles.beltGrade }).from(users)
      .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id)).where(inArray(users.role, [...MEMBER_ROLES])) : [],
  ]);
  const rows = selected?.closedAt ? snapshots.map(row => ({ id: row.id, userId: row.userId, name: row.name, beltGrade: row.beltGrade, stats: row.stats }))
    : members.map(row => ({ id: row.id, userId: row.id, name: row.name ?? row.email, beltGrade: row.beltGrade, stats: liveStats.get(row.id) }));
  return <div className="max-w-5xl space-y-6">
    <header><h1 className="text-2xl font-bold">Attendance periods</h1><p className="mt-1 text-sm text-zinc-500">Member thresholds use only the period in progress. Closed periods remain available below.</p></header>
    <AttendancePeriodControls active={active ? { id: active.id, name: active.name, startsOn: active.startsOn } : null} />
    <nav aria-label="Attendance period archive" className="flex flex-wrap gap-2">
      <Link href="/dashboard/coach/attendance" className="rounded-full border bg-white px-3 py-2 text-sm">Current period</Link>
      {periods.map(period => <Link key={period.id} href={`/dashboard/coach/attendance?period=${recordSlug(period.name, period.id)}`} className="rounded-full border bg-white px-3 py-2 text-sm">{period.name} · {period.closedAt ? "Archived" : "In progress"}</Link>)}
    </nav>
    {selected ? <>
      <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold">{selected.name} {selected.closedAt && <span className="text-sm font-normal text-zinc-500">(archived, read only)</span>}</h2>
        <p className="text-sm text-zinc-600">{selected.startsOn} – {selected.endsOn ?? "In progress"} · {sessions.length} sessions</p>
        {selected.closedAt && <p className="text-sm text-zinc-500">These saved percentages and exclusion decisions reflect the period when it was closed. They do not affect current attendance thresholds.</p>}
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-zinc-500"><tr><th className="py-2">Member</th><th>Belt</th><th>Present / counted</th><th>Attendance</th><th>{selected.closedAt ? "Status at closure" : "Status"}</th></tr></thead><tbody className="divide-y divide-zinc-100">
          {rows.map(row => <tr key={row.id}><td className="py-3 font-medium">{row.userId ? <Link href={`/dashboard/attendance?member=${row.userId}&period=${recordSlug(selected.name, selected.id)}`} className="text-brand-blue hover:underline">{row.name}</Link> : row.name}</td><td>{row.beltGrade ?? "Unranked"}</td><td>{row.stats?.present ?? 0}/{row.stats?.total ?? 0}</td><td>{row.stats?.pct == null ? "—" : `${row.stats.pct}%`}{row.stats && isProvisional(row.stats) && <span className="ml-1 text-xs text-zinc-500">provisional</span>}</td><td>{statusFor(row.stats?.pct ?? null)}</td></tr>)}
        </tbody></table></div>{!rows.length && <p className="text-sm text-zinc-500">No member attendance in this period.</p>}
      </section>
      <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-6"><h2 className="font-semibold">Sessions in this period</h2><ul className="mt-3 divide-y divide-zinc-100">{sessions.map(session => <li key={session.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{session.title} · {session.date}</span><Link href={`/dashboard/coach/attendance/${recordSlug(session.title, session.id)}`} className="font-medium text-brand-blue">{selected.closedAt ? "Review saved register" : "Record / review attendance"}</Link></li>)}</ul>{!sessions.length && <p className="mt-3 text-sm text-zinc-500">No sessions yet. Create training sessions from the coach dashboard.</p>}</section>
    </> : <p className="rounded-xl bg-white p-5 text-sm text-zinc-600">No active attendance period. Past periods can still be reviewed using the archive links.</p>}
  </div>;
}
