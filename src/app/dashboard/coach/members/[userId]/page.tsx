import { recordIdFromSlug } from "@/lib/record-slug";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, memberProfiles, medicalRecords, applications, subCommittees, leaveRequests, dues, gradingCandidates, gradingEvents } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { attendanceStatsFor, attendanceHistoryFor } from "@/lib/attendance-data";
import { memberAge, lagosToday } from "@/lib/members";
import { OUTCOME_LABELS } from "@/lib/grading";
import { LEAVE_REASON_LABELS } from "@/lib/exco";
function Details({ rows }: { rows: [string, string | null | undefined][] }) {
  return <dl className="grid gap-4 text-sm sm:grid-cols-2">{rows.map(([label,value]) => <div key={label} className="min-w-0"><dt className="text-zinc-500">{label}</dt><dd className="mt-1 break-words font-medium text-brand-black">{value || "Not recorded"}</dd></div>)}</dl>;
}
export default async function CoachMemberProfilePage({ params }: { params: Promise<{userId: string}> }) {
  await requireRole(["coach"]);
  const { userId: slug } = await params;
  const userId = recordIdFromSlug(slug);
  if (!userId) notFound();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) notFound();
  const [member] = await db.select({ profile: memberProfiles, email: users.email, username: users.username, role: users.role, status: users.status, joinedAt: users.createdAt, committee: subCommittees.name })
    .from(users).innerJoin(memberProfiles, eq(memberProfiles.userId, users.id)).leftJoin(subCommittees, eq(subCommittees.id, memberProfiles.assignedSubCommitteeId)).where(eq(users.id,userId)).limit(1);
  if (!member) notFound();
  const [stats, history, leave, medical, photo, charges, gradings] = await Promise.all([
    attendanceStatsFor(userId), attendanceHistoryFor(userId),
    db.select().from(leaveRequests).where(eq(leaveRequests.userId,userId)).orderBy(desc(leaveRequests.createdAt)),
    db.select({ emergencyName: medicalRecords.emergencyContactName, emergencyPhone: medicalRecords.emergencyContactPhone, relationship: medicalRecords.emergencyContactRelationship, altPhone: medicalRecords.altPhone, allergies: medicalRecords.allergies, conditions: medicalRecords.chronicConditions, injuries: medicalRecords.recentInjuries }).from(medicalRecords).where(eq(medicalRecords.userId,userId)).limit(1),
    db.select({ url: applications.photoData }).from(applications).where(eq(applications.userId,userId)).orderBy(desc(applications.createdAt)).limit(1),
    db.select({ amount: dues.amount }).from(dues).where(and(eq(dues.userId,userId),eq(dues.paid,false))),
    db.select({ id: gradingCandidates.id, title: gradingEvents.title, date: gradingEvents.date, outcome: gradingCandidates.outcome, awardedRank: gradingCandidates.awardedRank }).from(gradingCandidates).innerJoin(gradingEvents,eq(gradingEvents.id,gradingCandidates.gradingId)).where(and(eq(gradingCandidates.userId,userId),eq(gradingEvents.status,"published"))).orderBy(desc(gradingEvents.date)),
  ]);
  const profile=member.profile, age=memberAge(profile.dob), image=profile.avatarUrl || photo[0]?.url;
  const today=lagosToday();
  const activeLeave=leave.find(item=>item.status==="approved" && item.startDate<=today && item.endDate>=today);
  const emergency=medical[0];
  return <div className="max-w-5xl space-y-6">
    <Link href="/dashboard/coach/members" className="text-sm font-medium text-brand-red">&larr; Members</Link>
    <header className="flex flex-col gap-4 rounded-xl border border-black/10 bg-white p-4 sm:flex-row sm:items-center sm:p-6">
      {image ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={`${profile.fullName}'s profile picture`} className="h-28 w-28 shrink-0 rounded-xl object-cover" /></> : <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-sm text-zinc-500">No picture</div>}
      <div className="min-w-0"><h1 className="break-words text-2xl font-bold">{profile.fullName}</h1><p className="mt-1 text-sm text-zinc-500">{profile.beltGrade || "Belt not recorded"} · {age === null ? "Age not recorded" : `${age} years`}</p><p className="mt-2 text-sm capitalize">{member.role} · {member.status}</p><p className="mt-2 text-sm font-semibold">{activeLeave ? `On approved leave: ${activeLeave.startDate} to ${activeLeave.endDate}` : "Not currently on approved leave"}</p></div>
    </header>
    <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4 sm:p-6"><h2 className="font-semibold">Membership and contact</h2><Details rows={[
      ["Email",member.email],["Username",member.username],["Phone",profile.phone],["Address",profile.address],["Date of birth",profile.dob],["Membership category",profile.membershipCategory],["Department",profile.department],["Faculty",profile.faculty],["Level / Year",profile.levelYear],["Matric / Staff number",profile.matricOrStaffNo],["Sub-committee",member.committee],["Affiliated club",profile.affiliatedClub],["Joined",member.joinedAt.toISOString().slice(0,10)],
    ]}/></section>
    <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4 sm:p-6"><h2 className="font-semibold">Attendance record</h2><p className="text-sm">{stats?.present ?? 0}/{stats?.total ?? 0} counted sessions · {stats?.pct === null || !stats ? "No attendance data" : `${stats.pct}%`}</p><p className="text-xs text-zinc-500">{stats?.periodName ? `Current period: ${stats.periodName}. ` : "No attendance period in progress. "}Sessions before joining or during approved leave are excluded.</p><Link href={`/dashboard/attendance?member=${userId}`} className="text-sm font-medium text-brand-blue">Review this member&apos;s attendance periods &rarr;</Link>
      <ul className="divide-y divide-zinc-100 text-sm">{history.map((item,index)=><li key={`${item.sessionDate}:${index}`} className="flex flex-wrap justify-between gap-2 py-3"><span>{item.sessionTitle} · {item.sessionDate}</span><span>{item.beforeJoining ? "Excluded: before joining" : item.onLeave ? "Excluded: approved leave" : item.present ? "Present" : "Absent"}</span></li>)}</ul>{history.length===0 && <p className="text-sm text-zinc-500">No attendance recorded yet.</p>}
    </section>
    <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4 sm:p-6"><h2 className="font-semibold">Leave status and history</h2><ul className="space-y-3 text-sm">{leave.map(item=><li key={item.id} className="rounded-lg border border-zinc-100 p-3"><p className="font-medium">{LEAVE_REASON_LABELS[item.reasonCategory]} · {item.status}</p><p className="text-zinc-500">{item.startDate} to {item.endDate}</p><p className="mt-1 break-words">{item.details}</p>{item.reviewNotes&&<p className="mt-1 text-zinc-500">Review: {item.reviewNotes}</p>}</li>)}</ul>{leave.length===0&&<p className="text-sm text-zinc-500">No leave requests.</p>}</section>
    <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4 sm:p-6"><h2 className="font-semibold">Emergency contact and training safety</h2><Details rows={[["Emergency contact",emergency?.emergencyName],["Relationship",emergency?.relationship],["Emergency phone",emergency?.emergencyPhone],["Alternative phone",emergency?.altPhone],["Allergies",emergency?.allergies],["Chronic conditions",emergency?.conditions],["Recent injuries",emergency?.injuries]]}/></section>
    <section className="space-y-3 rounded-xl border border-black/10 bg-white p-4 sm:p-6"><h2 className="font-semibold">Grading history and dues</h2><p className="text-sm">Outstanding dues: NGN {charges.reduce((sum,item)=>sum+Number(item.amount),0).toLocaleString("en-NG",{minimumFractionDigits:2})} ({charges.length} unpaid charges)</p><ul className="space-y-2 text-sm">{gradings.map(item=><li key={item.id}>{item.title} · {item.date} · {OUTCOME_LABELS[item.outcome]}{item.awardedRank ? ` · ${item.awardedRank}` : ""}</li>)}</ul>{gradings.length===0&&<p className="text-sm text-zinc-500">No published grading results.</p>}</section>
  </div>;
}
