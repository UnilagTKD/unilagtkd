import { requireRole } from "@/lib/session";
import { MEMBER_ROLES } from "@/lib/roles";
import { db } from "@/db";
import { users, memberProfiles, trainingSessions } from "@/db/schema";
import { eq, inArray, count } from "drizzle-orm";
import { attendanceStatsByUser } from "@/lib/attendance-data";
import { explainExclusions, isProvisional } from "@/lib/attendance";
import { ATTENDANCE_THRESHOLDS } from "@/lib/constants";

function statusFor(pct: number | null) {
  if (pct === null) return { label: "No Data", className: "bg-zinc-100 text-zinc-500" };
  if (pct >= ATTENDANCE_THRESHOLDS.varsityRosterPool)
    return { label: "Varsity Pool", className: "bg-green-100 text-green-700" };
  if (pct >= ATTENDANCE_THRESHOLDS.promotionalGrading)
    return { label: "Grading Eligible", className: "bg-blue-100 text-blue-700" };
  if (pct >= ATTENDANCE_THRESHOLDS.activeMembership)
    return { label: "Active", className: "bg-yellow-100 text-yellow-700" };
  return { label: "Below Threshold", className: "bg-red-100 text-red-700" };
}

export default async function CoachAttendanceDashboardPage() {
  await requireRole(["coach"]);

  const [rows, [{ sessionCount }], attendanceByUser] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        fullName: memberProfiles.fullName,
        beltGrade: memberProfiles.beltGrade,
      })
      .from(users)
      .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
      .where(inArray(users.role, [...MEMBER_ROLES]))
      .groupBy(users.id, memberProfiles.fullName, users.email, memberProfiles.beltGrade),
    db.select({ sessionCount: count() }).from(trainingSessions),
    // Counts exclude sessions before each member joined and sessions inside
    // approved leave - see `@/lib/attendance`.
    attendanceStatsByUser(),
  ]);

  const stats = rows
    .map((r) => {
      const a = attendanceByUser.get(r.id);
      return {
        ...r,
        totalSessions: a?.total ?? 0,
        presentCount: a?.present ?? 0,
        pct: a?.pct ?? null,
        excluded: a ? a.excludedBeforeJoining + a.excludedOnLeave : 0,
        provisional: a ? isProvisional(a) : false,
        exclusionNote: a ? explainExclusions(a) : null,
      };
    })
    .sort((a, b) => {
      if (a.pct === null) return 1;
      if (b.pct === null) return -1;
      return a.pct - b.pct;
    });

  const withData = stats.filter((s) => s.pct !== null);
  const belowThreshold = withData.filter((s) => s.pct! < ATTENDANCE_THRESHOLDS.activeMembership).length;
  const avgPct =
    withData.length > 0
      ? Math.round(withData.reduce((sum, s) => sum + s.pct!, 0) / withData.length)
      : null;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Attendance Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Attendance rates across all training sessions marked so far.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-black/10 border-t-4 border-t-brand-blue bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Sessions Logged</div>
          <div className="mt-1 text-2xl font-bold text-brand-black">{sessionCount}</div>
        </div>
        <div className="rounded-xl border border-black/10 border-t-4 border-t-brand-red bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Below Threshold</div>
          <div className="mt-1 text-2xl font-bold text-brand-black">{belowThreshold}</div>
          <div className="mt-1 text-xs text-zinc-500">
            Under {ATTENDANCE_THRESHOLDS.activeMembership}% active membership
          </div>
        </div>
        <div className="rounded-xl border border-black/10 border-t-4 border-t-brand-blue bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Average Attendance</div>
          <div className="mt-1 text-2xl font-bold text-brand-black">
            {avgPct !== null ? `${avgPct}%` : "-"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">Roster ({stats.length})</h2>
        {stats.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No approved students yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Belt / Grade</th>
                  <th className="py-2">Sessions</th>
                  <th className="py-2">Present</th>
                  <th className="py-2">Attendance</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {stats.map((s) => {
                  const status = statusFor(s.pct);
                  return (
                    <tr key={s.id}>
                      <td className="py-2 font-medium text-brand-black">{s.fullName ?? s.email}</td>
                      <td className="py-2 text-zinc-600">{s.beltGrade ?? "Unranked"}</td>
                      <td className="py-2 text-zinc-600">
                        {s.totalSessions}
                        {s.excluded > 0 && (
                          <span
                            className="ml-1 cursor-help text-xs text-blue-700"
                            title={s.exclusionNote ?? undefined}
                          >
                            (+{s.excluded})
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-zinc-600">{s.presentCount}</td>
                      <td className="py-2 font-semibold text-brand-black">
                        {s.pct !== null ? `${s.pct}%` : "-"}
                        {s.provisional && (
                          <span className="ml-1 text-xs font-normal text-zinc-500">
                            provisional
                          </span>
                        )}
                      </td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
