import { asc, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { users, memberProfiles } from "@/db/schema";
import { MEMBER_ROLES } from "@/lib/roles";
import { canAppointExco } from "@/lib/verification-permissions";
import { ExcoPositionSelect } from "./exco-position-select";
import { EXCO_POSITIONS, EXCO_POSITION_LABELS, excoPositionLimit, type ExcoPosition } from "@/lib/exco";
export async function ExcoAppointments() {
  const session = await getSession();
  if (!session?.user || !canAppointExco(session.user.role)) return null;
  const [members, occupied] = await Promise.all([
    db.select({ id: users.id, email: users.email, role: users.role, position: users.excoPosition, name: memberProfiles.fullName, status: users.status })
      .from(users).leftJoin(memberProfiles, eq(memberProfiles.userId, users.id)).where(inArray(users.role,[...MEMBER_ROLES])).orderBy(asc(memberProfiles.fullName)),
    db.select({ position: users.excoPosition, count: count() }).from(users).groupBy(users.excoPosition),
  ]);
  const positionCounts: Partial<Record<ExcoPosition, number>> = {};
  for (const row of occupied) if (row.position) positionCounts[row.position] = row.count;
  return <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4 sm:p-6">
    <h2 className="font-semibold">Exco appointments</h2>
    <p className="text-sm text-zinc-500">Admins and coaches can appoint active registered members. Each position allows one person, except Vice President which allows two. Remove an existing appointment to free a place, including for inactive accounts.</p>
    <ul className="flex flex-wrap gap-2 text-xs text-zinc-600">{EXCO_POSITIONS.map(position => <li key={position} className="rounded-full bg-zinc-100 px-3 py-1">{EXCO_POSITION_LABELS[position]}: {positionCounts[position] ?? 0}/{excoPositionLimit(position)}</li>)}</ul>
    <ul className="divide-y divide-zinc-100">{members.map(member => <li key={member.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0"><h3 className="break-words text-sm font-medium">{member.name ?? member.email}</h3><p className="break-words text-xs text-zinc-500">{member.email} · {member.status}</p></div>
      {member.id === session.user.id ? <span className="text-xs text-zinc-500">{member.position ? EXCO_POSITION_LABELS[member.position] : "Unassigned"} (you)</span> : member.status === "active" || member.position ? <ExcoPositionSelect userId={member.id} memberName={member.name ?? member.email} currentRole={member.role} currentPosition={member.position} currentStatus={member.status} positionCounts={positionCounts} /> : <span className="text-xs text-zinc-500">Inactive account</span>}
    </li>)}</ul>{members.length === 0 && <p className="text-sm text-zinc-500">No registered members available.</p>}
  </section>;
}
