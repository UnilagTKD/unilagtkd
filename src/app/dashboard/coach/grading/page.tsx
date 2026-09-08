import Link from "next/link";
import { requireRole } from "@/lib/session";
import { MEMBER_ROLES } from "@/lib/roles";
import { db } from "@/db";
import {
  users,
  memberProfiles,
  dues,
  gradingEvents,
  gradingCandidates,
  gradingRequests,
} from "@/db/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";
import {
  gradingOptions,
  beltById,
  resolveRank,
  rankLabel,
  checkEligibility,
  GRADING_STATUS_LABELS,
  GRADING_STATUS_STYLES,
} from "@/lib/grading";
import { ATTENDANCE_THRESHOLDS } from "@/lib/constants";
import { attendanceStatsByUser } from "@/lib/attendance-data";
import { describeAttendance, explainExclusions } from "@/lib/attendance";
import { getGradingWindow, loadEligibilityContext } from "@/lib/grading-data";
import { GradingWindowControl } from "./grading-window-control";
import { CreateGradingForm } from "./create-grading-form";
import { GradingRequestRow } from "./grading-request-row";

export default async function CoachGradingPage() {
  await requireRole(["coach"]);

  const [
    { state: windowState, note: windowNote },
    gradings,
    roster,
    duesRows,
    pendingRequests,
    attendanceByUser,
  ] = await Promise.all([
      getGradingWindow(),
      db
        .select({
          id: gradingEvents.id,
          title: gradingEvents.title,
          date: gradingEvents.date,
          location: gradingEvents.location,
          status: gradingEvents.status,
          fee: gradingEvents.fee,
          candidates: sql<number>`count(${gradingCandidates.id})`.mapWith(Number),
        })
        .from(gradingEvents)
        .leftJoin(gradingCandidates, eq(gradingCandidates.gradingId, gradingEvents.id))
        .groupBy(gradingEvents.id)
        .orderBy(desc(gradingEvents.date)),
      // Attendance is aggregated in the same query; dues are counted separately
      // below, because joining both would multiply the rows against each other.
      db
        .select({
          id: users.id,
          email: users.email,
          status: users.status,
          joinedAt: users.createdAt,
          fullName: memberProfiles.fullName,
          beltGrade: memberProfiles.beltGrade,
          rankAttainedAt: memberProfiles.rankAttainedAt,
        })
        .from(users)
        .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
        .where(inArray(users.role, [...MEMBER_ROLES]))
        .groupBy(users.id, memberProfiles.id),
      db
        .select({
          userId: dues.userId,
          outstanding: sql<number>`count(${dues.id})`.mapWith(Number),
        })
        .from(dues)
        .where(eq(dues.paid, false))
        .groupBy(dues.userId),
      db
        .select({
          id: gradingRequests.id,
          userId: gradingRequests.userId,
          targetBeltId: gradingRequests.targetBeltId,
          note: gradingRequests.note,
          fullName: memberProfiles.fullName,
          email: users.email,
        })
        .from(gradingRequests)
        .innerJoin(users, eq(users.id, gradingRequests.userId))
        .leftJoin(memberProfiles, eq(memberProfiles.userId, gradingRequests.userId))
        .where(eq(gradingRequests.status, "pending"))
        .orderBy(desc(gradingRequests.createdAt)),
      attendanceStatsByUser(),
    ]);

  const outstandingByUser = new Map(duesRows.map((d) => [d.userId, d.outstanding]));

  const openGradingsList = gradings
    .filter((g) => g.status === "scheduled" || g.status === "in_progress")
    .map((g) => ({ id: g.id, title: g.title, fee: g.fee }));

  const gradingRequestRows = await Promise.all(
    pendingRequests.map(async (r) => {
      const context = await loadEligibilityContext(r.userId);
      const target = beltById(r.targetBeltId);
      const verdict = context && target ? checkEligibility({ ...context, target }) : null;
      return {
        id: r.id,
        studentName: r.fullName ?? r.email,
        targetLabel: target ? target.name : "an unknown belt",
        note: r.note,
        eligible: verdict?.eligible ?? false,
        blockers: verdict?.blockers.map((b) => b.message) ?? [],
      };
    })
  );

  const candidates = roster
    .map((member) => {
      const resolved = resolveRank(member.beltGrade);
      const stats = attendanceByUser.get(member.id);

      const options = gradingOptions({
        currentRank: resolved.rank,
        status: member.status,
        sessionsRecorded: stats?.total ?? 0,
        attendancePct: stats?.pct ?? null,
        attendanceCountsFrom: stats?.countsFrom,
        outstandingDues: outstandingByUser.get(member.id) ?? 0,
        rankAttainedAt: member.rankAttainedAt,
        joinedAt: member.joinedAt,
      });

      return {
        id: member.id,
        name: member.fullName ?? member.email,
        rank: resolved.rank,
        rankInferred: resolved.inferred,
        attendance: stats,
        options,
      };
    })
    // Ready candidates first, then those a double would suit, then the rest.
    .sort((a, b) => {
      const score = (m: typeof a) =>
        m.options.some((o) => o.eligible && o.isDouble)
          ? 0
          : m.options.some((o) => o.eligible)
            ? 1
            : 2;
      return score(a) - score(b) || a.name.localeCompare(b.name);
    });

  const readyCount = candidates.filter((c) => c.options.some((o) => o.eligible)).length;
  const doubleCount = candidates.filter((c) =>
    c.options.some((o) => o.eligible && o.isDouble)
  ).length;
  const openGradings = gradings.filter(
    (g) => g.status === "scheduled" || g.status === "in_progress"
  ).length;

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Grading</h1>
        <p className="text-sm text-zinc-500">
          Belt promotion testing. Open a grading period when one is approaching, enter
          candidates, mark them, then publish to apply the promotions.
        </p>
      </div>

      <GradingWindowControl state={windowState} note={windowNote} />

      {gradingRequestRows.length > 0 && (
        <div className="rounded-xl border border-black/10 bg-white p-6">
          <h2 className="font-semibold text-brand-black">
            Grading Requests ({gradingRequestRows.length})
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Self-nominations from members while the window is open. Accept enters them into an
            existing grading; decline sends them back with an optional reason.
          </p>
          <ul className="mt-2 divide-y divide-black/5">
            {gradingRequestRows.map((r) => (
              <GradingRequestRow
                key={r.id}
                requestId={r.id}
                studentName={r.studentName}
                targetLabel={r.targetLabel}
                note={r.note}
                eligible={r.eligible}
                blockers={r.blockers}
                openGradings={openGradingsList}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-black/10 border-t-4 border-t-brand-blue bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Eligible Now</div>
          <div className="mt-1 text-2xl font-bold text-brand-black">{readyCount}</div>
          <div className="mt-1 text-xs text-zinc-500">
            Meet every requirement for their next rank
          </div>
        </div>
        <div className="rounded-xl border border-black/10 border-t-4 border-t-brand-red bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Double Eligible</div>
          <div className="mt-1 text-2xl font-bold text-brand-black">{doubleCount}</div>
          <div className="mt-1 text-xs text-zinc-500">
            Clear the {ATTENDANCE_THRESHOLDS.varsityRosterPool}% bar for a two-rank jump
          </div>
        </div>
        <div className="rounded-xl border border-black/10 border-t-4 border-t-brand-blue bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Open Gradings</div>
          <div className="mt-1 text-2xl font-bold text-brand-black">{openGradings}</div>
          <div className="mt-1 text-xs text-zinc-500">Scheduled or being marked</div>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-brand-black">Gradings</h2>
          {windowState.open ? (
            <CreateGradingForm />
          ) : (
            <span className="text-xs text-zinc-500">
              Open a grading period to schedule one.
            </span>
          )}
        </div>
        {gradings.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No gradings have been held yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-black/5 text-sm">
            {gradings.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium text-brand-black">{g.title}</div>
                  <div className="text-xs text-zinc-500">
                    {g.date}
                    {g.location && ` · ${g.location}`} · {g.candidates}{" "}
                    {g.candidates === 1 ? "candidate" : "candidates"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${GRADING_STATUS_STYLES[g.status]}`}
                  >
                    {GRADING_STATUS_LABELS[g.status]}
                  </span>
                  <Link
                    href={`/dashboard/coach/grading/${g.id}`}
                    className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-brand-black hover:bg-zinc-50"
                  >
                    {g.status === "published" ? "View Results" : "Open Panel"}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">Who Can Grade ({candidates.length})</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Requirements are checked against live attendance and dues, as at today. A blocked
          member can still be entered from a grading panel, with a recorded reason.
        </p>

        {candidates.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No approved students yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-black/5">
            {candidates.map((c) => (
              <li key={c.id} className="py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-medium text-brand-black">{c.name}</div>
                  <div className="text-xs text-zinc-500">
                    {rankLabel(c.rank)}
                    {c.rankInferred && (
                      <span
                        className="ml-1 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-800"
                        title="No exact grade on file - this was assumed from the belt on their profile. Confirm before examining."
                      >
                        assumed
                      </span>
                    )}
                    {" · "}
                    {c.attendance ? describeAttendance(c.attendance) : "no attendance data"}
                    {c.attendance && explainExclusions(c.attendance) && (
                      <span
                        className="ml-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
                        title={explainExclusions(c.attendance)!}
                      >
                        adjusted
                      </span>
                    )}
                  </div>
                </div>

                {c.options.length === 0 ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    At the top of the club ladder - nothing further to grade.
                  </p>
                ) : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {c.options.map((o) => (
                      <div
                        key={o.target.id}
                        className={`rounded-lg border p-3 text-xs ${
                          o.eligible
                            ? "border-green-200 bg-green-50"
                            : "border-zinc-200 bg-zinc-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-brand-black">
                            {o.target.name}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-medium ${
                              o.isDouble
                                ? "bg-brand-red/10 text-brand-red"
                                : "bg-zinc-200 text-zinc-600"
                            }`}
                          >
                            {o.isDouble ? "Double" : "Single"}
                          </span>
                        </div>
                        <div className="mt-1 text-zinc-500">
                          Pass {o.promotion.passMark}% · min{" "}
                          {o.promotion.minCriterionScore}/10 per component ·{" "}
                          {o.promotion.requiredPoomsae.join(" + ") || "no form"}
                        </div>
                        {o.eligible ? (
                          <div className="mt-1 font-medium text-green-700">
                            Meets every requirement
                          </div>
                        ) : (
                          <ul className="mt-1 list-inside list-disc text-zinc-600">
                            {o.blockers.map((b) => (
                              <li key={b.code}>{b.message}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
