import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  gradingCandidates,
  gradingEvents,
  gradingExaminerInvites,
  gradingExaminerMarks,
  memberProfiles,
  users,
} from "@/db/schema";
import {
  beltById,
  buildPromotion,
  criteriaFor,
  rankById,
  rankLabel,
  type CriterionScores,
} from "@/lib/grading";
import { hashToken } from "@/lib/tokens";
import { capabilityTokenFromSlug } from "@/lib/record-slug";
import { ExaminerMarksForm } from "./examiner-marks-form";

export const metadata: Metadata = {
  title: "External Grading Examiner",
  robots: { index: false, follow: false },
};

type ExaminerMarksValues = {
  scoreBasics: number | null;
  scorePoomsae: number | null;
  scoreKyorugi: number | null;
  scoreKyukpa: number | null;
  scoreHoshinsul: number | null;
  scoreTheory: number | null;
  notes: string | null;
  submittedAt: Date;
};

function scoresFromRow(row: ExaminerMarksValues | undefined): CriterionScores {
  if (!row) return {};
  return {
    basics: row.scoreBasics,
    poomsae: row.scorePoomsae,
    kyorugi: row.scoreKyorugi,
    kyukpa: row.scoreKyukpa,
    hoshinsul: row.scoreHoshinsul,
    theory: row.scoreTheory,
  };
}

export default async function ExternalExaminerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: slug } = await params;
  const token = capabilityTokenFromSlug(slug);
  if (!token) notFound();

  const [invite] = await db
    .select({
      id: gradingExaminerInvites.id,
      gradingId: gradingExaminerInvites.gradingId,
      examinerName: gradingExaminerInvites.examinerName,
      examinerEmail: gradingExaminerInvites.examinerEmail,
      expiresAt: gradingExaminerInvites.expiresAt,
      gradingTitle: gradingEvents.title,
      gradingDate: gradingEvents.date,
      gradingLocation: gradingEvents.location,
      gradingStatus: gradingEvents.status,
    })
    .from(gradingExaminerInvites)
    .innerJoin(gradingEvents, eq(gradingEvents.id, gradingExaminerInvites.gradingId))
    .where(
      and(
        eq(gradingExaminerInvites.tokenHash, hashToken(token)),
        isNull(gradingExaminerInvites.revokedAt),
        gt(gradingExaminerInvites.expiresAt, new Date())
      )
    )
    .limit(1);

  if (
    !invite ||
    invite.expiresAt <= new Date() ||
    invite.gradingStatus === "published" ||
    invite.gradingStatus === "cancelled"
  ) {
    notFound();
  }

  const [candidates, examinerMarks] = await Promise.all([
    db
      .select({
        id: gradingCandidates.id,
        fromRank: gradingCandidates.fromRank,
        toBelt: gradingCandidates.toBelt,
        outcome: gradingCandidates.outcome,
        fullName: memberProfiles.fullName,
      })
      .from(gradingCandidates)
      .innerJoin(users, eq(users.id, gradingCandidates.userId))
      .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
      .where(eq(gradingCandidates.gradingId, invite.gradingId)),
    db
      .select({
        candidateId: gradingExaminerMarks.candidateId,
        scoreBasics: gradingExaminerMarks.scoreBasics,
        scorePoomsae: gradingExaminerMarks.scorePoomsae,
        scoreKyorugi: gradingExaminerMarks.scoreKyorugi,
        scoreKyukpa: gradingExaminerMarks.scoreKyukpa,
        scoreHoshinsul: gradingExaminerMarks.scoreHoshinsul,
        scoreTheory: gradingExaminerMarks.scoreTheory,
        notes: gradingExaminerMarks.notes,
        submittedAt: gradingExaminerMarks.submittedAt,
      })
      .from(gradingExaminerMarks)
      .where(eq(gradingExaminerMarks.inviteId, invite.id)),
  ]);

  const marksByCandidate = new Map(examinerMarks.map((row) => [row.candidateId, row] as const));
  const forms = candidates.map((candidate) => {
    const from = rankById(candidate.fromRank);
    const to = beltById(candidate.toBelt);
    if (!from || !to) return null;
    const promotion = buildPromotion(from, to);
    const marks = marksByCandidate.get(candidate.id);
    return {
      id: candidate.id,
      name: candidate.fullName ?? "Candidate",
      fromLabel: rankLabel(from),
      toLabel: to.name,
      requiredPoomsae: promotion.requiredPoomsae,
      criteria: criteriaFor(),
      initialScores: scoresFromRow(marks),
      initialNotes: marks?.notes ?? null,
      submittedAt: marks?.submittedAt.toISOString() ?? null,
      disabled: candidate.outcome === "absent" || candidate.outcome === "withdrawn",
    };
  });

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-xl border border-black/10 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-red">
            External examiner access
          </p>
          <h1 className="mt-1 text-2xl font-bold text-brand-black">{invite.gradingTitle}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {invite.gradingDate}
            {invite.gradingLocation && ` · ${invite.gradingLocation}`}
          </p>
          <p className="mt-4 text-sm text-zinc-600">
            Welcome, {invite.examinerName}. Submit individual marks and optional notes for
            each candidate. The club coach reviews these marks and records the final result;
            this form does not calculate a total or pass/fail outcome.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            This event-only link expires {invite.expiresAt.toLocaleString()}.
          </p>
        </header>

        {forms.length === 0 ? (
          <div className="rounded-xl border border-black/10 bg-white p-6 text-sm text-zinc-500">
            No candidates have been entered for this grading yet.
          </div>
        ) : (
          forms.map(
            (form) =>
              form && (
                <ExaminerMarksForm
                  key={form.id}
                  token={token}
                  candidateId={form.id}
                  candidateName={form.name}
                  fromLabel={form.fromLabel}
                  toLabel={form.toLabel}
                  requiredPoomsae={form.requiredPoomsae}
                  criteria={form.criteria}
                  initialScores={form.initialScores}
                  initialNotes={form.initialNotes}
                  submittedAt={form.submittedAt}
                  disabled={form.disabled}
                />
              )
          )
        )}
      </div>
    </main>
  );
}
