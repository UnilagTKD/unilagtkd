import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { MEMBER_ROLES } from "@/lib/roles";
import { db } from "@/db";
import {
  users,
  memberProfiles,
  dues,
  gradingEvents,
  gradingCandidates,
} from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import {
  gradingOptions,
  beltById,
  rankById,
  rankLabel,
  resolveRank,
  buildPromotion,
  GRADING_STATUS_LABELS,
  GRADING_STATUS_STYLES,
} from "@/lib/grading";
import { getGradingWindow } from "@/lib/grading-data";
import { attendanceStatsByUser } from "@/lib/attendance-data";
import { AddCandidateForm } from "./add-candidate-form";
import { CandidateScoring } from "./candidate-scoring";
import { PublishGradingButton } from "./publish-grading-button";
import { GradingFeeControl } from "./grading-fee-control";

export default async function GradingPanelPage({
  params,
}: {
  params: Promise<{ gradingId: string }>;
}) {
  await requireRole(["coach"]);
  const { gradingId } = await params;

  const [grading] = await db
    .select()
    .from(gradingEvents)
    .where(eq(gradingEvents.id, gradingId))
    .limit(1);

  if (!grading) notFound();

  const [{ state: windowState }, entered, roster, duesRows, attendanceByUser] =
    await Promise.all([
    getGradingWindow(),
    db
      .select({
        id: gradingCandidates.id,
        userId: gradingCandidates.userId,
        fromRank: gradingCandidates.fromRank,
        toBelt: gradingCandidates.toBelt,
        awardedRank: gradingCandidates.awardedRank,
        scoreBasics: gradingCandidates.scoreBasics,
        scorePoomsae: gradingCandidates.scorePoomsae,
        scoreKyorugi: gradingCandidates.scoreKyorugi,
        scoreKyukpa: gradingCandidates.scoreKyukpa,
        scoreHoshinsul: gradingCandidates.scoreHoshinsul,
        scoreTheory: gradingCandidates.scoreTheory,
        totalScore: gradingCandidates.totalScore,
        outcome: gradingCandidates.outcome,
        examinerNotes: gradingCandidates.examinerNotes,
        overrideReason: gradingCandidates.eligibilityOverrideReason,
        fullName: memberProfiles.fullName,
        email: users.email,
      })
      .from(gradingCandidates)
      .innerJoin(users, eq(users.id, gradingCandidates.userId))
      .leftJoin(memberProfiles, eq(memberProfiles.userId, gradingCandidates.userId))
      .where(eq(gradingCandidates.gradingId, gradingId)),
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
    attendanceStatsByUser(),
  ]);

  const outstandingByUser = new Map(duesRows.map((d) => [d.userId, d.outstanding]));
  const enteredIds = new Set(entered.map((c) => c.userId));
  const readOnly = grading.status === "published" || grading.status === "cancelled";

  // Fee charges raised against this grading, so the panel can see who has paid
  // without leaving the grading screen.
  const feeCharges = await db
    .select({
      userId: dues.userId,
      amount: dues.amount,
      paid: dues.paid,
      paymentClaimed: dues.paymentClaimed,
      receiptNo: dues.receiptNo,
      fullName: memberProfiles.fullName,
      email: users.email,
    })
    .from(dues)
    .innerJoin(users, eq(users.id, dues.userId))
    .leftJoin(memberProfiles, eq(memberProfiles.userId, dues.userId))
    .where(eq(dues.gradingId, gradingId));

  const feePaidCount = feeCharges.filter((c) => c.paid).length;


  // Everyone not already entered, with their options judged as at the grading
  // date rather than today - a candidate entered in advance still has to clear
  // time-in-grade by the day they are examined.
  const available = roster
    .filter((m) => !enteredIds.has(m.id))
    .map((m) => {
      const resolved = resolveRank(m.beltGrade);
      const stats = attendanceByUser.get(m.id);

      return {
        id: m.id,
        name: m.fullName ?? m.email,
        currentRank: rankLabel(resolved.rank),
        rankInferred: resolved.inferred,
        options: gradingOptions({
          currentRank: resolved.rank,
          status: m.status,
          sessionsRecorded: stats?.total ?? 0,
          attendancePct: stats?.pct ?? null,
          attendanceCountsFrom: stats?.countsFrom,
          outstandingDues: outstandingByUser.get(m.id) ?? 0,
          rankAttainedAt: m.rankAttainedAt,
          joinedAt: m.joinedAt,
          asOf: new Date(grading.date),
        }).map((o) => ({
          targetBeltId: o.target.id,
          targetLabel: o.target.name,
          isDouble: o.isDouble,
          eligible: o.eligible,
          blockers: o.blockers.map((b) => b.message),
        })),
      };
    })
    .filter((m) => m.options.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const candidates = entered
    .map((c) => {
      const from = rankById(c.fromRank);
      const to = beltById(c.toBelt);
      // A record pointing at a rank or belt no longer on the ladder cannot be
      // marked, but must still be visible so a coach can remove it.
      const promotion = from && to ? buildPromotion(from, to) : null;

      return {
        id: c.id,
        name: c.fullName ?? c.email,
        fromLabel: from ? rankLabel(from) : c.fromRank,
        toLabel: to ? to.name : c.toBelt,
        toBeltId: c.toBelt,
        fromRankId: c.fromRank,
        awardedRankId: c.awardedRank,
        isDouble: promotion?.isDouble ?? false,
        outcome: c.outcome,
        totalScore: c.totalScore,
        examinerNotes: c.examinerNotes,
        overrideReason: c.overrideReason,
        scores: {
          basics: c.scoreBasics,
          poomsae: c.scorePoomsae,
          kyorugi: c.scoreKyorugi,
          kyukpa: c.scoreKyukpa,
          hoshinsul: c.scoreHoshinsul,
          theory: c.scoreTheory,
        },
        valid: promotion !== null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const unresolved = candidates.filter((c) => c.outcome === "pending").length;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link
          href="/dashboard/coach/grading"
          className="text-xs font-medium text-brand-red hover:underline"
        >
          &larr; All gradings
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-black">{grading.title}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${GRADING_STATUS_STYLES[grading.status]}`}
          >
            {GRADING_STATUS_LABELS[grading.status]}
          </span>
        </div>
        <p className="text-sm text-zinc-500">
          {grading.date}
          {grading.location && ` · ${grading.location}`}
        </p>
        {grading.notes && <p className="mt-2 text-sm text-zinc-600">{grading.notes}</p>}
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-brand-black">Grading Fee</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Charged to each candidate when they are entered, and settled through the
              normal payments flow.
            </p>
          </div>
          <GradingFeeControl gradingId={gradingId} fee={grading.fee} readOnly={readOnly} />
        </div>

        {feeCharges.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-medium text-zinc-500">
              {feePaidCount} of {feeCharges.length} paid
            </div>
            <ul className="mt-2 divide-y divide-black/5 text-sm">
              {feeCharges.map((c) => (
                <li
                  key={c.userId}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span className="text-brand-black">{c.fullName ?? c.email}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">
                      NGN {Number(c.amount).toLocaleString()}
                    </span>
                    {c.paid ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Paid{c.receiptNo ? " \u00b7 " + c.receiptNo : ""}
                      </span>
                    ) : c.paymentClaimed ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Claimed, awaiting Treasurer
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                        Unpaid
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>


      {grading.status === "published" && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          This grading is published and its promotions have been applied. Results are now
          visible to the candidates, and the record is read-only.
        </div>
      )}

      {grading.status === "cancelled" && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          This grading was cancelled. No promotions were applied.
        </div>
      )}

      {!readOnly && (
        <div className="rounded-xl border border-black/10 bg-white p-6">
          <h2 className="font-semibold text-brand-black">Enter Candidates</h2>
          {windowState.open ? (
            <>
              <p className="mt-1 text-sm text-zinc-500">
                Pick the rank being graded to. A double covers two ranks in one sitting and
                carries a higher pass mark, a higher per-component minimum, and both forms.
              </p>
              <AddCandidateForm gradingId={gradingId} members={available} />
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">
              {windowState.label} Candidates can only be entered while a grading period is
              open. Marking and publishing this grading still work.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-brand-black">
            Panel ({candidates.length})
          </h2>
          {!readOnly && candidates.length > 0 && (
            <PublishGradingButton
              gradingId={gradingId}
              unresolved={unresolved}
              promoting={
                candidates.filter((c) => c.outcome === "pass" || c.outcome === "distinction")
                  .length
              }
            />
          )}
        </div>

        {candidates.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            Nobody has been entered for this grading yet.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {candidates.map((c) => (
              <CandidateScoring key={c.id} candidate={c} readOnly={readOnly} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
