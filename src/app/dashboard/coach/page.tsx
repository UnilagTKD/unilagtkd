import { requireRole } from "@/lib/session";
import { MEMBER_ROLES } from "@/lib/roles";
import { db } from "@/db";
import {
  users,
  memberProfiles,
  subCommittees,
  trainingSessions,
  announcements,
  applications,
} from "@/db/schema";
import { desc, eq, inArray, or } from "drizzle-orm";
import { CreateSessionForm } from "./create-session-form";
import { SessionsList } from "./sessions-list";
import { ApplicationReview } from "@/components/dashboard/application-review";
import { MemberRegister } from "@/components/dashboard/member-register";
import { SessionCheckInQr } from "@/components/dashboard/session-checkin-qr";
import { toDateInput } from "@/lib/dates";

export default async function CoachDashboardPage() {
  await requireRole(["coach"]);

  const [roster, sessions, coachAnnouncements, pendingApplications] = await Promise.all([
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
    db.select().from(trainingSessions).orderBy(desc(trainingSessions.date)),
    db
      .select()
      .from(announcements)
      .where(or(eq(announcements.audience, "all"), eq(announcements.audience, "coaches")))
      .orderBy(desc(announcements.createdAt)),
    db
      .select()
      .from(applications)
      .where(eq(applications.status, "pending"))
      .orderBy(desc(applications.createdAt)),
  ]);

  const activeSession = sessions.find((s) => s.date === toDateInput(new Date())) ?? null;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Coach Dashboard</h1>
        <p className="text-sm text-zinc-500">Roster, schedule, and attendance</p>
      </div>

      {activeSession && (
        <SessionCheckInQr sessionId={activeSession.id} title={activeSession.title} />
      )}

      {pendingApplications.length > 0 && (
        <div className="rounded-xl border border-black/10 bg-white p-6">
          <h2 className="font-semibold text-brand-black">
            Pending Applications ({pendingApplications.length})
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Approving activates the applicant&apos;s account and hands you a setup link to
            share with them.
          </p>
          <div className="mt-4 space-y-4">
            {pendingApplications.map((a) => (
              <ApplicationReview key={a.id} application={a} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-brand-black">Training Sessions</h2>
          <CreateSessionForm />
        </div>
        <SessionsList sessions={sessions} />
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
