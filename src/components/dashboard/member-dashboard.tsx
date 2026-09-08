import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { memberProfiles, dues, subCommittees } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ATTENDANCE_THRESHOLDS, BANK_DETAILS } from "@/lib/constants";
import { attendanceHistoryFor, attendanceStatsFor } from "@/lib/attendance-data";
import { explainExclusions, isProvisional } from "@/lib/attendance";
import { ClaimPaymentButton } from "./claim-payment-button";

export async function MemberDashboard({
  role,
  title,
  showSubCommittee = true,
}: {
  role: "student" | "alumni";
  title: string;
  showSubCommittee?: boolean;
}) {
  // Exco officers are members too - their office only adds a dashboard, it does
  // not take their student one away.
  const user = await requireRole(role === "student" ? ["student", "exco"] : [role]);

  const [profile] = await db
    .select({
      fullName: memberProfiles.fullName,
      membershipCategory: memberProfiles.membershipCategory,
      matricOrStaffNo: memberProfiles.matricOrStaffNo,
      department: memberProfiles.department,
      faculty: memberProfiles.faculty,
      levelYear: memberProfiles.levelYear,
      beltGrade: memberProfiles.beltGrade,
      assignedSubCommitteeId: memberProfiles.assignedSubCommitteeId,
    })
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, user.id))
    .limit(1);

  const [subCommittee] = profile?.assignedSubCommitteeId
    ? await db
        .select({ name: subCommittees.name })
        .from(subCommittees)
        .where(eq(subCommittees.id, profile.assignedSubCommitteeId))
        .limit(1)
    : [];

  // Both come from `@/lib/attendance-data`, which drops sessions held before
  // the member joined and sessions inside approved leave. See `@/lib/attendance`.
  const [attendanceRows, stats] = await Promise.all([
    attendanceHistoryFor(user.id),
    attendanceStatsFor(user.id),
  ]);

  const duesRows = await db
    .select()
    .from(dues)
    .where(eq(dues.userId, user.id))
    .orderBy(desc(dues.createdAt));

  const attendancePct = stats?.pct ?? null;
  const outstandingDues = duesRows.filter((d) => !d.paid);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">
          Welcome, {profile?.fullName ?? user.email}
        </h1>
        <p className="text-sm text-zinc-500">{title}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-black/10 border-t-4 border-t-brand-red bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Attendance</div>
          <div className="mt-1 text-2xl font-bold text-brand-black">
            {attendancePct !== null ? `${attendancePct}%` : "-"}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Active membership requires {ATTENDANCE_THRESHOLDS.activeMembership}%+
          </div>
          {stats && stats.total > 0 && (
            <div className="mt-1 text-xs text-zinc-500">
              {stats.present}/{stats.total} sessions since {stats.countsFrom}
              {isProvisional(stats) && " · provisional"}
            </div>
          )}
          {stats && explainExclusions(stats) && (
            <div className="mt-1 text-xs text-blue-700">{explainExclusions(stats)}</div>
          )}
        </div>
        <div className="rounded-xl border border-black/10 border-t-4 border-t-brand-blue bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Belt / Grade</div>
          <div className="mt-1 text-2xl font-bold text-brand-black">
            {profile?.beltGrade || "Unranked"}
          </div>
        </div>
        <div className="rounded-xl border border-black/10 border-t-4 border-t-brand-red bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Dues Outstanding</div>
          <div className="mt-1 text-2xl font-bold text-brand-black">
            {outstandingDues.length === 0 ? "None" : outstandingDues.length}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">Profile</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Membership Category</dt>
            <dd className="text-brand-black">{profile?.membershipCategory ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Matric / Staff No.</dt>
            <dd className="text-brand-black">{profile?.matricOrStaffNo ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Department</dt>
            <dd className="text-brand-black">{profile?.department ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Faculty</dt>
            <dd className="text-brand-black">{profile?.faculty ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Level / Year</dt>
            <dd className="text-brand-black">{profile?.levelYear ?? "-"}</dd>
          </div>
          {showSubCommittee && (
            <div>
              <dt className="text-zinc-500">Sub-Committee</dt>
              <dd className="text-brand-black">{subCommittee?.name ?? "Not yet assigned"}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">Attendance History</h2>
        {attendanceRows.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No attendance recorded yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-black/5 text-sm">
            {attendanceRows.map((a, i) => {
              // Excluded sessions are shown rather than hidden, so a member can
              // see that a night they were marked has been set aside and why -
              // silently dropping rows looks like data going missing.
              const excluded = a.beforeJoining || a.onLeave;
              return (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className={excluded ? "text-zinc-400" : undefined}>
                    {a.sessionTitle}, {a.sessionDate}
                  </span>
                  {excluded ? (
                    <span className="flex-none rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                      {a.onLeave ? "Not counted, on leave" : "Not counted, before joining"}
                    </span>
                  ) : (
                    <span
                      className={
                        a.present
                          ? "flex-none rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                          : "flex-none rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                      }
                    >
                      {a.present ? "Present" : "Absent"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">Dues &amp; Payment</h2>
        {duesRows.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No dues on record.</p>
        ) : (
          <ul className="mt-4 divide-y divide-black/5 text-sm">
            {duesRows.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  {d.periodLabel}: &#8358;{d.amount}
                </span>
                {d.paid ? (
                  <span className="flex-none rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Paid
                  </span>
                ) : d.paymentClaimed ? (
                  <span className="flex-none rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                    Awaiting Confirmation
                  </span>
                ) : (
                  <div className="flex-none">
                    <ClaimPaymentButton duesId={d.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {outstandingDues.length > 0 && (
          <div className="mt-4 rounded-lg bg-zinc-50 p-4 text-xs text-zinc-600">
            <div className="font-semibold text-brand-black">How to Pay</div>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              <div>
                Bank: <span className="font-medium text-zinc-800">{BANK_DETAILS.bankName}</span>
              </div>
              <div>
                Account Name:{" "}
                <span className="font-medium text-zinc-800">{BANK_DETAILS.accountName}</span>
              </div>
              <div className="sm:col-span-2">
                Account Number:{" "}
                <span className="font-medium text-zinc-800">{BANK_DETAILS.accountNumber}</span>
              </div>
            </div>
            <p className="mt-2">{BANK_DETAILS.instructions}</p>
          </div>
        )}
      </div>
    </div>
  );
}
