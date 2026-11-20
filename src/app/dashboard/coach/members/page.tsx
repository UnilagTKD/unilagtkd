import { asc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { users, memberProfiles } from "@/db/schema";
import { attendanceStatsByUser } from "@/lib/attendance-data";
import { memberAge } from "@/lib/members";
import { MemberDirectory } from "@/components/dashboard/member-directory";
export default async function CoachMembersPage() {
  await requireRole(["coach"]);
  const [members, stats] = await Promise.all([
    db.select({ id: users.id, name: memberProfiles.fullName, email: users.email, phone: memberProfiles.phone,
      dob: memberProfiles.dob, belt: memberProfiles.beltGrade, status: users.status })
      .from(users).innerJoin(memberProfiles, eq(memberProfiles.userId, users.id)).orderBy(asc(memberProfiles.fullName)),
    attendanceStatsByUser(["student", "alumni", "exco", "coach", "admin"]),
  ]);
  return <div className="max-w-6xl space-y-6">
    <header><h1 className="text-2xl font-bold text-brand-black">Members</h1><p className="mt-1 text-sm text-zinc-500">The club member directory. Select a member to view their complete profile, leave status, and attendance history. Attendance percentages cover the current monitoring period only.</p></header>
    <MemberDirectory members={members.map(member => { const record = stats.get(member.id); return {
      ...member, age: memberAge(member.dob), present: record?.present ?? 0, total: record?.total ?? 0, pct: record?.pct ?? null,
    }; })} />
  </div>;
}
