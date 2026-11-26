import { SessionExpiryRefresh } from "@/components/dashboard/session-expiry-refresh";
import { sessionExpiresAt } from "@/lib/training-session";
import Link from "next/link";
import { expireTrainingSessions } from "@/lib/training-session-data";
import { sessionHasEnded, sessionStartsAt } from "@/lib/training-session";
import { requireRole } from "@/lib/session";
import { MEMBER_ROLES } from "@/lib/roles";
import { db } from "@/db";
import {
  users,
  memberProfiles,
  subCommittees,
  trainingSessions,
  announcements,
  leaveRequests,
} from "@/db/schema";
import { desc, eq, inArray, or } from "drizzle-orm";
import { CreateSessionForm } from "./create-session-form";
import { SessionsList } from "./sessions-list";
import { MemberRegister } from "@/components/dashboard/member-register";
import { SessionCheckInQr } from "@/components/dashboard/session-checkin-qr";
import { LeaveRequestsPanel } from "../exco/leave-requests-panel";
import { getActiveAttendancePeriod, periodSessionFilter } from "@/lib/attendance-periods";

export default async function CoachDashboardPage() {
  const coach = await requireRole(["coach"]);
  await expireTrainingSessions();
  const period = await getActiveAttendancePeriod();

  const [roster, sessions, coachAnnouncements, leaveRows] =
    await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          fullName: memberProfiles.fullName,
          phone: memberProfiles.phone,
          membershipCategory: memberProfiles.membershipCategory,
          department: memberProfiles.department,
          beltGrade: memberProfiles.beltGrade,
          levelYear: memberProfiles.levelYear,
          subCommitteeName: subCommittees.name,
        })
        .from(users)
        .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
        .leftJoin(subCommittees, eq(subCommittees.id, memberProfiles.assignedSubCommitteeId))
        .where(inArray(users.role, [...MEMBER_ROLES])),
      db.select().from(trainingSessions).where(periodSessionFilter(period?.id)).orderBy(desc(trainingSessions.date)),
      db
        .select()
        .from(announcements)
        .where(or(eq(announcements.audience, "all"), eq(announcements.audience, "coaches")))
        .orderBy(desc(announcements.createdAt)),
      db
        .select({
          id: leaveRequests.id,
          userId: leaveRequests.userId,
          reasonCategory: leaveRequests.reasonCategory,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
          details: leaveRequests.details,
          status: leaveRequests.status,
          reviewNotes: leaveRequests.reviewNotes,
          memberName: memberProfiles.fullName,
          memberEmail: users.email,
        })
        .from(leaveRequests)
        .innerJoin(users, eq(leaveRequests.userId, users.id))
        .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
        .orderBy(desc(leaveRequests.createdAt)),
    ]);

  const activeSession =
    sessions.find((s) => new Date() >= sessionStartsAt(s) && !sessionHasEnded(s)) ?? null;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Coach Dashboard</h1>
        <p className="text-sm text-zinc-500">Roster, schedule, and attendance</p>
      </div>

<Link href="/dashboard/coach/members" className="inline-block rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white">View Members</Link>
      {activeSession && <SessionExpiryRefresh deadline={sessionExpiresAt(activeSession).toISOString()} />}
      {activeSession && (
        <SessionCheckInQr sessionId={activeSession.id} title={activeSession.title} />
      )}



      <div className="rounded-xl border border-black/10 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-brand-black">Training Sessions</h2>
          {period && <CreateSessionForm />}
        </div>
        <SessionsList sessions={sessions} />
        <p className="mt-3 text-sm text-zinc-500">{period ? `Monitoring: ${period.name}` : "Start an attendance period before adding sessions."} <Link href="/dashboard/coach/attendance" className="font-medium text-brand-blue">Manage periods and archives &rarr;</Link></p>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">Announcements</h2>
        <p className="text-xs text-zinc-500">
          Posted by Exco. Read-only here — replies or questions go through the
          usual club channels.
        </p>
        {coachAnnouncements.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No announcements yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-black/5">
            {coachAnnouncements.map((a) => (
              <li key={a.id} className="py-3">
                <div className="text-sm font-semibold text-brand-black">{a.title}</div>
                <p className="mt-1 text-sm text-zinc-600">{a.body}</p>
                <span className="mt-1 inline-block text-xs uppercase tracking-wide text-zinc-400">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/dashboard/coach/exco" className="inline-block rounded-full border border-brand-red px-4 py-2 text-sm font-semibold text-brand-red">Exco appointments</Link>

      <LeaveRequestsPanel
        reviewerId={coach.id}
        requests={leaveRows.map((r) => ({
          id: r.id,
          userId: r.userId,
          memberName: r.memberName ?? r.memberEmail,
          reasonCategory: r.reasonCategory,
          startDate: r.startDate,
          endDate: r.endDate,
          details: r.details,
          status: r.status,
          reviewNotes: r.reviewNotes,
        }))}
      />

      <MemberRegister
        note="Everyone on the training register, with contact, grading, and sub-committee details."
        rows={roster.map((r) => ({
          id: r.id,
          name: r.fullName ?? r.email,
          email: r.email,
          phone: r.phone,
          membershipCategory: r.membershipCategory,
          department: r.department,
          levelYear: r.levelYear,
          beltGrade: r.beltGrade,
          subCommitteeName: r.subCommitteeName,
        }))}
      />
    </div>
  );
}
