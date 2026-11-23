"use server";
import { afterAccountAction } from "@/lib/action-notifications";

import { revalidatePath } from "next/cache";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import {
  memberProfiles,
  gradingWindows,
  gradingEvents,
  gradingCandidates,
  gradingExaminerInvites,
  gradingExaminerMarks,
  gradingRequests,
  dues,
} from "@/db/schema";
import type { UserRole } from "@/types/next-auth";
import {
  addDays,
  buildPromotion,
  checkEligibility,
  criteriaFor,
  gradingWindowState,
  beltById,
  isGradingDecision,
  isPromoting,
  rankById,
  resolveRank,
  toDateInput,
  DEFAULT_WINDOW_DAYS,
  MAX_CRITERION_SCORE,
  type CriterionScores,
  type GradingDecision,
  type Rank,
} from "@/lib/grading";
import { getGradingWindow, loadEligibilityContext } from "@/lib/grading-data";
import { sendExternalExaminerInviteEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/site-url";
import { recordSlug } from "@/lib/record-slug";
import { rateLimit, requestRateLimit } from "@/lib/shared-rate-limit";
import { validate, recordId, reviewNote } from "@/lib/validation/actions";
import { z } from "zod";
import {
  examinerTokenExpiry,
  generateExaminerToken,
  hashToken,
} from "@/lib/tokens";

// Server actions are reachable by direct POST, not only through the dashboard,
// so every one of them re-checks the caller's role. `@/lib/session` exports a
// `requireRole` that redirects, which is right for pages and wrong here.
async function requireCoach() {
  const session = await auth();
  const allowed: UserRole[] = ["coach"];
  if (!session?.user || !allowed.includes(session.user.role)) {
    throw new Error("Not authorized");
  }
  if (!(await rateLimit(`grading-write:${session.user.id}`, 120, 60_000)).allowed) throw new Error("Too many requests. Please try again later.");
  return session.user;
}

// ---------------------------------------------------------------------------
// The grading window
// ---------------------------------------------------------------------------

/** Throws unless grading activity may start today. */
async function requireOpenWindow() {
  const { state } = await getGradingWindow();
  if (!state.open) {
    throw new Error(
      `${state.label} Open a grading period before entering candidates or scheduling a grading.`
    );
  }
  return state;
}

/**
 * Opens a grading period. Defaults to starting today and running for
 * DEFAULT_WINDOW_DAYS, which is the usual "we grade in about three weeks" case.
 *
 * Opening supersedes whatever came before - `getGradingWindow` always reads the
 * most recent row - so a coach who mistypes a date can simply open again.
 */
export async function openGradingWindow(data: {
  opensAt?: string;
  closesAt?: string;
  note?: string;
}) {
  const user = await requireCoach();
  data = validate(z.object({ opensAt: z.string().date().optional(), closesAt: z.string().date().optional(), note: reviewNote }).strict(), data);
  const today = new Date();
  const opensAt = data.opensAt || toDateInput(today);
  const closesAt = data.closesAt || addDays(new Date(opensAt), DEFAULT_WINDOW_DAYS);

  if (closesAt < opensAt) {
    throw new Error("A grading period cannot close before it opens");
  }

  await db.insert(gradingWindows).values({
    opensAt,
    closesAt,
    note: data.note?.trim() || null,
    openedBy: user.id,
  });

  revalidateGrading();
  return { opensAt, closesAt };
}

/**
 * Closes the current period early. The window would lapse at `closesAt` on its
 * own; this is for finishing ahead of time.
 *
 * Gradings already scheduled stay markable and publishable - see the note on
 * the window in `@/lib/grading`.
 */
export async function closeGradingWindow() {
  const user = await requireCoach();

  const [window] = await db
    .select()
    .from(gradingWindows)
    .orderBy(desc(gradingWindows.openedAt))
    .limit(1);

  if (!window) throw new Error("No grading period has been opened");

  const state = gradingWindowState(window);
  if (!state.open && state.phase !== "upcoming") {
    throw new Error("There is no open grading period to close");
  }

  await db
    .update(gradingWindows)
    .set({ closedAt: new Date(), closedBy: user.id })
    .where(eq(gradingWindows.id, window.id));

  revalidateGrading();
}

function revalidateGrading() {
  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/coach/grading");
  revalidatePath("/dashboard/grading");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");
}

// ---------------------------------------------------------------------------
// Grading events
// ---------------------------------------------------------------------------

/**
 * Parses a coach-entered fee. Returns null for blank (meaning "no fee set"),
 * and throws on anything that is not a sane non-negative amount.
 */
function parseFee(raw?: string | null): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(trimmed) || !Number.isFinite(value) || value < 0) {
    throw new Error("The grading fee must be a non-negative amount");
  }
  return value.toFixed(2);
}

/**
 * Raises the grading fee against a candidate as a normal `dues` row, so grading
 * money uses the same claim -> treasurer-confirm -> receipt path as everything
 * else. No-op when the grading has no fee, or the candidate already has one.
 */
async function chargeCandidate(gradingId: string, userId: string) {
  const [grading] = await db
    .select({ fee: gradingEvents.fee, title: gradingEvents.title })
    .from(gradingEvents)
    .where(eq(gradingEvents.id, gradingId))
    .limit(1);

  if (!grading?.fee || Number(grading.fee) <= 0) return;

  const [existing] = await db
    .select({ id: dues.id })
    .from(dues)
    .where(and(eq(dues.gradingId, gradingId), eq(dues.userId, userId)))
    .limit(1);

  if (existing) return;

  await db.insert(dues).values({
    userId,
    gradingId,
    periodLabel: `Grading: ${grading.title}`,
    amount: grading.fee,
  });
}

/**
 * Charges a candidate a specific amount for a grading, overriding the
 * grading's standard fee for just this person - e.g. a coach settling on a
 * price while accepting their self-nomination, rather than waiting for a fee
 * to be set on the grading itself.
 *
 * Updates the amount in place if this candidate is already charged (and not
 * yet paid); leaves a paid charge untouched, since a receipt has already been
 * issued against it.
 */
async function chargeCandidateAmount(gradingId: string, userId: string, amount: string) {
  const [existing] = await db
    .select({ id: dues.id, paid: dues.paid })
    .from(dues)
    .where(and(eq(dues.gradingId, gradingId), eq(dues.userId, userId)))
    .limit(1);

  if (existing) {
    if (existing.paid) return;
    await db.update(dues).set({ amount }).where(eq(dues.id, existing.id));
    return;
  }

  const [grading] = await db
    .select({ title: gradingEvents.title })
    .from(gradingEvents)
    .where(eq(gradingEvents.id, gradingId))
    .limit(1);
  if (!grading) return;

  await db.insert(dues).values({
    userId,
    gradingId,
    periodLabel: `Grading: ${grading.title}`,
    amount,
  });
}

export async function createGrading(data: {
  title: string;
  date: string;
  location?: string;
  notes?: string;
  fee?: string;
}) {
  const user = await requireCoach();
  await requireOpenWindow();
  data = validate(z.object({ title: z.string().trim().min(1).max(255), date: z.string().date(), location: z.string().trim().max(255).optional(), notes: z.string().trim().max(10000).optional(), fee: z.string().max(20).optional() }).strict(), data);
  if (!data.title.trim()) throw new Error("A grading needs a title");
  if (!data.date) throw new Error("A grading needs a date");

  const [created] = await db
    .insert(gradingEvents)
    .values({
      title: data.title.trim(),
      date: data.date,
      location: data.location?.trim() || null,
      notes: data.notes?.trim() || null,
      fee: parseFee(data.fee),
      createdBy: user.id,
    })
    .returning({ id: gradingEvents.id });

  revalidatePath("/dashboard/grading");
  revalidatePath("/dashboard/coach/grading");
  return { id: created.id };
}

export async function cancelGrading(gradingId: string) {
  await requireCoach();

  const grading = await loadOpenGrading(gradingId);
  if (grading.status === "published") {
    throw new Error("A published grading cannot be cancelled");
  }

  await db
    .update(gradingEvents)
    .set({ status: "cancelled" })
    .where(eq(gradingEvents.id, gradingId));
  await db
    .update(gradingExaminerInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(gradingExaminerInvites.gradingId, gradingId),
        isNull(gradingExaminerInvites.revokedAt)
      )
    );

  revalidatePath("/dashboard/grading");
  revalidatePath("/dashboard/coach/grading");
  revalidatePath("/dashboard/coach/grading/[gradingId]", "page");
}

export async function createExternalExaminerInvite(data: {
  gradingId: string;
  examinerName: string;
  examinerEmail: string;
}) {
  const user = await requireRole(["coach", "admin"]);
  if (!(await rateLimit(`examiner-invite:${user.id}`, 20, 60_000)).allowed) throw new Error("Too many invitations.");
  if (
    !data ||
    typeof data !== "object" ||
    typeof data.gradingId !== "string" ||
    typeof data.examinerName !== "string" ||
    typeof data.examinerEmail !== "string"
  ) {
    throw new Error("Provide an examiner name, email, and grading.");
  }
  const examinerName = data.examinerName.trim();
  const examinerEmail = data.examinerEmail.trim().toLowerCase();

  if (!examinerName || examinerName.length > 255) {
    throw new Error("Enter an examiner name of 1 to 255 characters.");
  }
  if (
    examinerEmail.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(examinerEmail)
  ) {
    throw new Error("Enter a valid examiner email address.");
  }

  const grading = await loadOpenGrading(data.gradingId);
  if (grading.status === "published" || grading.status === "cancelled") {
    throw new Error(`An examiner link cannot be created for a ${grading.status} grading.`);
  }

  const token = generateExaminerToken();
  const expiresAt = examinerTokenExpiry(7);
  await db.transaction(async (tx) => {
    await tx
      .update(gradingExaminerInvites)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(gradingExaminerInvites.gradingId, grading.id),
          isNull(gradingExaminerInvites.revokedAt)
        )
      );
    await tx.insert(gradingExaminerInvites).values({
      gradingId: grading.id,
      examinerName,
      examinerEmail,
      tokenHash: hashToken(token),
      expiresAt,
      createdBy: user.id,
    });
  });

  const baseUrl = await getBaseUrl();
  const inviteUrl = new URL(`/examiner/${recordSlug(grading.title, token)}`, baseUrl).toString();
  const emailResult = await sendExternalExaminerInviteEmail(
    examinerEmail,
    examinerName,
    grading.title,
    inviteUrl,
    expiresAt
  );

  revalidatePath("/dashboard/coach/grading/[gradingId]", "page");
  return {
    inviteUrl,
    expiresAt: expiresAt.toISOString(),
    emailSent: emailResult.ok,
    emailError: emailResult.ok ? null : emailResult.error,
  };
}

async function loadOpenGrading(gradingId: string) {
  validate(recordId, gradingId);
  const [grading] = await db
    .select()
    .from(gradingEvents)
    .where(eq(gradingEvents.id, gradingId))
    .limit(1);

  if (!grading) throw new Error("Grading not found");
  return grading;
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

/**
 * Enters a member for a grading at belt `targetBeltId`, which may be one or two
 * belts up - see `promotionTargets` in `@/lib/grading`. The geup inside that
 * belt is not decided here; the panel awards it at marking.
 *
 * Eligibility is re-checked against live attendance and dues for coach
 * guidance. A warning never prevents the coach from entering the candidate.
 */
export async function registerGradingCandidate(data: {
  gradingId: string;
  userId: string;
  targetBeltId: string;
  overrideReason?: string;
}) {
  await requireCoach();
  await requireOpenWindow();
  data = validate(z.object({ gradingId: recordId, userId: recordId, targetBeltId: z.string().min(1).max(50), overrideReason: reviewNote }).strict(), data);
  const grading = await loadOpenGrading(data.gradingId);
  if (grading.status === "published" || grading.status === "cancelled") {
    throw new Error(`Candidates cannot be added to a ${grading.status} grading`);
  }

  const target = beltById(data.targetBeltId);
  if (!target) throw new Error("Unknown target belt");

  const context = await loadEligibilityContext(data.userId);
  if (!context) throw new Error("Member not found");

  // Eligibility is judged as at the grading date, not today - a candidate
  // entered in advance must clear time-in-grade by the day they are examined.
  const verdict = checkEligibility({
    ...context,
    target,
    asOf: new Date(grading.date),
  });

  const override = data.overrideReason?.trim();

  if (!verdict.promotion) {
    // Not a permitted promotion at all. No override covers this: there is no
    // rank to award.
    throw new Error(verdict.blockers.map((b) => b.message).join(" "));
  }

  const [existing] = await db
    .select({ id: gradingCandidates.id })
    .from(gradingCandidates)
    .where(
      and(
        eq(gradingCandidates.gradingId, data.gradingId),
        eq(gradingCandidates.userId, data.userId)
      )
    )
    .limit(1);

  if (existing) {
    throw new Error(`${context.fullName} is already entered for this grading`);
  }

  const [created] = await db
    .insert(gradingCandidates)
    .values({
      gradingId: data.gradingId,
      userId: data.userId,
      fromRank: context.currentRank.id,
      toBelt: target.id,
      eligibilityOverrideReason: verdict.eligible ? null : override || null,
    })
    .returning({ id: gradingCandidates.id });

  await chargeCandidate(data.gradingId, data.userId);

  revalidatePath("/dashboard/coach/grading/[gradingId]", "page");
  revalidatePath("/dashboard/coach/grading");
  revalidatePath("/dashboard/payments");

  return { id: created.id };
}

export async function removeGradingCandidate(candidateId: string) {
  await requireCoach();

  const candidate = await loadCandidate(candidateId);
  if (candidate.gradingStatus === "published") {
    throw new Error("A published result cannot be removed");
  }

  await db.delete(gradingCandidates).where(eq(gradingCandidates.id, candidateId));

  revalidatePath("/dashboard/coach/grading/[gradingId]", "page");
}

// ---------------------------------------------------------------------------
// Self-nominations (student/alumni requests to be graded)
// ---------------------------------------------------------------------------

async function loadPendingRequest(requestId: string) {
  validate(recordId, requestId);
  const [request] = await db
    .select()
    .from(gradingRequests)
    .where(eq(gradingRequests.id, requestId))
    .limit(1);

  if (!request) throw new Error("Request not found");
  if (request.status !== "pending") throw new Error("This request has already been reviewed");
  return request;
}

/**
 * Accepts a member's grading request by entering them into an existing
 * grading event - the same eligibility check and override path as entering a
 * candidate directly, since this is exactly that, just member-initiated.
 *
 * `amount`, if given, is the fee for this candidate specifically - it wins
 * over the grading's standard fee, so a coach can price this acceptance on
 * the spot instead of relying on (or waiting for) a fee set on the grading.
 */
async function acceptGradingRequestCore(data: {
  requestId: string;
  gradingId: string;
  overrideReason?: string;
  amount?: string;
}) {
  const user = await requireCoach();
  data = validate(z.object({ requestId: recordId, gradingId: recordId, overrideReason: reviewNote, amount: z.string().max(20).optional() }).strict(), data);
  const amount = parseFee(data.amount);
  const request = await loadPendingRequest(data.requestId);

  const created = await registerGradingCandidate({
    gradingId: data.gradingId,
    userId: request.userId,
    targetBeltId: request.targetBeltId,
    overrideReason: data.overrideReason,
  });

  if (amount) {
    await chargeCandidateAmount(data.gradingId, request.userId, amount);
  }

  await db
    .update(gradingRequests)
    .set({
      status: "accepted",
      reviewedBy: user.id,
      reviewedAt: new Date(),
      gradingCandidateId: created.id,
    })
    .where(eq(gradingRequests.id, data.requestId));

  revalidatePath("/dashboard/coach/grading");
  revalidatePath("/dashboard/coach/grading/[gradingId]", "page");
  revalidatePath("/dashboard/grading");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");
}

async function declineGradingRequestCore(requestId: string, reviewNote?: string) {
  const user = await requireCoach();
  if (reviewNote !== undefined && (typeof reviewNote !== "string" || reviewNote.length > 2000)) throw new Error("Review notes must be at most 2,000 characters.");
  await loadPendingRequest(requestId);

  await db
    .update(gradingRequests)
    .set({
      status: "declined",
      reviewedBy: user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote?.trim() || null,
    })
    .where(eq(gradingRequests.id, requestId));

  revalidatePath("/dashboard/coach/grading");
  revalidatePath("/dashboard/grading");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");
}

async function loadCandidate(candidateId: string) {
  validate(recordId, candidateId);
  const [row] = await db
    .select({
      id: gradingCandidates.id,
      gradingId: gradingCandidates.gradingId,
      userId: gradingCandidates.userId,
      fromRank: gradingCandidates.fromRank,
      toBelt: gradingCandidates.toBelt,
      outcome: gradingCandidates.outcome,
      gradingStatus: gradingEvents.status,
      gradingDate: gradingEvents.date,
    })
    .from(gradingCandidates)
    .innerJoin(gradingEvents, eq(gradingEvents.id, gradingCandidates.gradingId))
    .where(eq(gradingCandidates.id, candidateId))
    .limit(1);

  if (!row) throw new Error("Candidate not found");
  return row;
}

/** Resolves the stored rank and target belt back into a promotion. */
function promotionForCandidate(fromRankId: string, toBeltId: string) {
  const from = rankById(fromRankId);
  const to = beltById(toBeltId);
  if (!from || !to) {
    throw new Error("This record refers to a rank or belt no longer on the ladder");
  }
  return buildPromotion(from, to);
}

export async function saveExternalExaminerMarks(data: {
  token: string;
  candidateId: string;
  scores: CriterionScores;
  notes?: string;
}) {
  if (!(await requestRateLimit("examiner-marks", 120, 5 * 60_000)).allowed) throw new Error("Too many submissions. Please try again later.");
  if (
    !data ||
    typeof data !== "object" ||
    typeof data.token !== "string" ||
    typeof data.candidateId !== "string" ||
    !/^[a-f0-9]{64}$/i.test(data.token)
  ) {
    throw new Error("This examiner link is invalid or expired.");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.candidateId)) {
    throw new Error("Choose a valid candidate.");
  }

  const [invite] = await db
    .select({
      id: gradingExaminerInvites.id,
      gradingId: gradingExaminerInvites.gradingId,
      expiresAt: gradingExaminerInvites.expiresAt,
      revokedAt: gradingExaminerInvites.revokedAt,
      gradingStatus: gradingEvents.status,
    })
    .from(gradingExaminerInvites)
    .innerJoin(gradingEvents, eq(gradingEvents.id, gradingExaminerInvites.gradingId))
    .where(
      and(
        eq(gradingExaminerInvites.tokenHash, hashToken(data.token)),
        isNull(gradingExaminerInvites.revokedAt),
        gt(gradingExaminerInvites.expiresAt, new Date())
      )
    )
    .limit(1);

  if (
    !invite ||
    invite.revokedAt ||
    invite.expiresAt <= new Date() ||
    invite.gradingStatus === "published" ||
    invite.gradingStatus === "cancelled"
  ) {
    throw new Error("This examiner link is invalid, expired, or closed.");
  }

  const [candidate] = await db
    .select({
      id: gradingCandidates.id,
      fromRank: gradingCandidates.fromRank,
      toBelt: gradingCandidates.toBelt,
      outcome: gradingCandidates.outcome,
    })
    .from(gradingCandidates)
    .where(
      and(
        eq(gradingCandidates.id, data.candidateId),
        eq(gradingCandidates.gradingId, invite.gradingId)
      )
    )
    .limit(1);

  if (!candidate) throw new Error("This candidate is not part of the invited grading.");
  if (candidate.outcome === "absent" || candidate.outcome === "withdrawn") {
    throw new Error("Marks cannot be submitted for an absent or withdrawn candidate.");
  }

  promotionForCandidate(candidate.fromRank, candidate.toBelt);
  if (!data.scores || typeof data.scores !== "object" || Array.isArray(data.scores)) {
    throw new Error("Enter marks before submitting.");
  }

  const scores: CriterionScores = {};
  let hasScore = false;
  for (const criterion of criteriaFor()) {
    const value = data.scores[criterion.id];
    if (value === null || value === undefined) {
      scores[criterion.id] = null;
      continue;
    }
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > MAX_CRITERION_SCORE
    ) {
      throw new Error(
        `${criterion.label} marks must be a whole number from 0 to ${MAX_CRITERION_SCORE}.`
      );
    }
    scores[criterion.id] = value;
    hasScore = true;
  }

  if (data.notes !== undefined && typeof data.notes !== "string") {
    throw new Error("Examiner notes must be text.");
  }
  if (data.notes && data.notes.length > 5000) {
    throw new Error("Examiner notes must be 5,000 characters or fewer.");
  }
  if (!hasScore) throw new Error("Enter at least one mark before submitting.");
  const notes = data.notes?.trim() || null;

  const submittedAt = new Date();
  await db
    .insert(gradingExaminerMarks)
    .values({
      inviteId: invite.id,
      candidateId: candidate.id,
      scoreBasics: scores.basics ?? null,
      scorePoomsae: scores.poomsae ?? null,
      scoreKyorugi: scores.kyorugi ?? null,
      scoreKyukpa: scores.kyukpa ?? null,
      scoreHoshinsul: scores.hoshinsul ?? null,
      scoreTheory: scores.theory ?? null,
      notes,
      submittedAt,
    })
    .onConflictDoUpdate({
      target: [gradingExaminerMarks.inviteId, gradingExaminerMarks.candidateId],
      set: {
        scoreBasics: scores.basics ?? null,
        scorePoomsae: scores.poomsae ?? null,
        scoreKyorugi: scores.kyorugi ?? null,
        scoreKyukpa: scores.kyukpa ?? null,
        scoreHoshinsul: scores.hoshinsul ?? null,
        scoreTheory: scores.theory ?? null,
        notes,
        submittedAt,
      },
    });

  if (invite.gradingStatus === "scheduled") {
    await db
      .update(gradingEvents)
      .set({ status: "in_progress" })
      .where(eq(gradingEvents.id, invite.gradingId));
  }

  return { submittedAt: submittedAt.toISOString() };
}

/** Saves individual marks and the coach's manual decision. */
export async function saveCandidateScores(data: {
  candidateId: string;
  scores: CriterionScores;
  outcome: GradingDecision;
  examinerNotes?: string;
  awardedRankId?: string | null;
}) {
  const user = await requireCoach();
  if (
    !data ||
    typeof data !== "object" ||
    typeof data.candidateId !== "string" ||
    !data.scores ||
    typeof data.scores !== "object" ||
    Array.isArray(data.scores)
  ) {
    throw new Error("Provide valid candidate marks and a result.");
  }

  const candidate = await loadCandidate(data.candidateId);
  if (candidate.gradingStatus === "published") {
    throw new Error("A published grading can no longer be marked");
  }
  if (candidate.gradingStatus === "cancelled") {
    throw new Error("This grading was cancelled");
  }
  if (candidate.outcome === "absent" || candidate.outcome === "withdrawn") {
    throw new Error(
      "This candidate is marked absent or withdrawn. Reinstate them before entering marks."
    );
  }

  if (!isGradingDecision(data.outcome)) {
    throw new Error("Choose a valid grading result.");
  }
  if (data.examinerNotes !== undefined && typeof data.examinerNotes !== "string") {
    throw new Error("Examiner notes must be text.");
  }

  const promotion = promotionForCandidate(candidate.fromRank, candidate.toBelt);
  const examined = criteriaFor().map((c) => c.id);

  const scores: CriterionScores = {};
  for (const id of examined) {
    const value = data.scores[id];
    if (value === null || value === undefined) {
      scores[id] = null;
      continue;
    }
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > MAX_CRITERION_SCORE
    ) {
      throw new Error(`${id} marks must be a whole number from 0 to ${MAX_CRITERION_SCORE}.`);
    }
    scores[id] = value;
  }

  let awardedRank: string | null = null;
  if (isPromoting(data.outcome)) {
    const chosen = data.awardedRankId
      ? promotion.awardable.find((r) => r.id === data.awardedRankId)
      : undefined;

    if (!chosen) {
      throw new Error(
        `Choose the grade to award within ${promotion.to.name}: ${promotion.awardable
          .map((r) => r.grade)
          .join(", ")}.`
      );
    }
    awardedRank = chosen.id;
  }

  if (data.examinerNotes !== undefined && (typeof data.examinerNotes !== "string" || data.examinerNotes.length > 5000)) {
    throw new Error("Examiner notes must be 5,000 characters or fewer.");
  }

  await db
    .update(gradingCandidates)
    .set({
      scoreBasics: scores.basics ?? null,
      scorePoomsae: scores.poomsae ?? null,
      scoreKyorugi: scores.kyorugi ?? null,
      scoreKyukpa: scores.kyukpa ?? null,
      scoreHoshinsul: scores.hoshinsul ?? null,
      scoreTheory: scores.theory ?? null,
      totalScore: null,
      outcome: data.outcome,
      awardedRank,
      examinerNotes: data.examinerNotes?.trim() || null,
      examinedBy: user.id,
      examinedAt: new Date(),
    })
    .where(eq(gradingCandidates.id, data.candidateId));

  // First marks entered move the grading off "scheduled".
  if (candidate.gradingStatus === "scheduled") {
    await db
      .update(gradingEvents)
      .set({ status: "in_progress" })
      .where(eq(gradingEvents.id, candidate.gradingId));
  }

  revalidatePath("/dashboard/coach/grading/[gradingId]", "page");

  return { outcome: data.outcome, awardedRank };
}

/**
 * Marks a candidate absent or withdrawn, or puts them back in the running.
 * Both states clear any marks already entered - a candidate who did not test
 * has no score, and leaving one behind would misreport the panel's record.
 */
export async function setCandidateAttendance(
  candidateId: string,
  state: "absent" | "withdrawn" | "reinstate"
) {
  await requireCoach();
  if (!["absent", "withdrawn", "reinstate"].includes(state)) {
    throw new Error("Choose a valid candidate attendance state.");
  }

  const candidate = await loadCandidate(candidateId);
  if (candidate.gradingStatus === "published") {
    throw new Error("A published grading can no longer be changed");
  }
  if (candidate.gradingStatus === "cancelled") {
    throw new Error("This grading was cancelled");
  }

  await db
    .update(gradingCandidates)
    .set({
      outcome: state === "reinstate" ? "pending" : state,
      awardedRank: null,
      scoreBasics: null,
      scorePoomsae: null,
      scoreKyorugi: null,
      scoreKyukpa: null,
      scoreHoshinsul: null,
      scoreTheory: null,
      totalScore: null,
      examinerNotes: null,
      examinedAt: null,
      examinedBy: null,
    })
    .where(eq(gradingCandidates.id, candidateId));

  revalidatePath("/dashboard/coach/grading/[gradingId]", "page");
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

/**
 * Closes a grading and applies its promotions.
 *
 * Publishing is the only thing that changes a member's belt, and it happens
 * once: every candidate must be resolved first (marked, absent, or withdrawn),
 * and a published grading is read-only afterwards. Candidates see nothing until
 * this runs, so the panel can revise a mark without a member having seen it.
 */
async function publishGradingCore(gradingId: string) {
  const user = await requireCoach();

  const grading = await loadOpenGrading(gradingId);
  if (grading.status === "published") throw new Error("This grading is already published");
  if (grading.status === "cancelled") throw new Error("This grading was cancelled");

  const candidates = await db
    .select()
    .from(gradingCandidates)
    .where(eq(gradingCandidates.gradingId, gradingId));

  if (candidates.length === 0) {
    throw new Error("There are no candidates to publish");
  }

  const unresolved = candidates.filter((c) => c.outcome === "pending");
  if (unresolved.length > 0) {
    throw new Error(
      `${unresolved.length} candidate(s) still have no result. Finish marking them, or mark them absent or withdrawn, before publishing.`
    );
  }

  const promoted: string[] = [];

  for (const candidate of candidates) {
    if (!isPromoting(candidate.outcome)) continue;

    const belt = beltById(candidate.toBelt);
    const from = rankById(candidate.fromRank);
    const target = rankById(candidate.awardedRank);
    if (!belt || !from || !target || !belt.grades.includes(target.id)) {
      throw new Error(
        "Every promoted candidate needs a valid grade selected before results can be published."
      );
    }

    const [profile] = await db
      .select({ beltGrade: memberProfiles.beltGrade })
      .from(memberProfiles)
      .where(eq(memberProfiles.userId, candidate.userId))
      .limit(1);

    // A member with no profile row has nothing to promote - the result still
    // stands on the grading record.
    if (!profile) continue;

    // Guard against a stale record demoting someone: if their belt has already
    // moved to or past the target (a second grading published out of order, or
    // a manual correction), leave it alone.
    if (resolveRank(profile.beltGrade).rank.order >= target.order) continue;

    await db
      .update(memberProfiles)
      .set({ beltGrade: beltGradeText(target), rankAttainedAt: grading.date })
      .where(eq(memberProfiles.userId, candidate.userId));

    promoted.push(candidate.userId);
  }

  await db
    .update(gradingEvents)
    .set({ status: "published", publishedBy: user.id, publishedAt: new Date() })
    .where(eq(gradingEvents.id, gradingId));
  await db
    .update(gradingExaminerInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(gradingExaminerInvites.gradingId, gradingId),
        isNull(gradingExaminerInvites.revokedAt)
      )
    );

  revalidatePath("/dashboard/coach/grading");
  revalidatePath("/dashboard/coach/grading/[gradingId]", "page");
  revalidatePath("/dashboard/coach");
  revalidatePath("/dashboard/coach/attendance");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");
  revalidatePath("/dashboard/grading");

  return { promoted: promoted.length, total: candidates.length };
}

/**
 * How a rank is written into `memberProfiles.beltGrade`, which is free text
 * shared with registration and settings. `resolveRank` reads this back, so the
 * format has to stay something it can parse.
 */
function beltGradeText(rank: Rank): string {
  return `${rank.belt} ${rank.grade}`;
}

/**
 * Sets or clears the fee for a grading. Charging is retroactive: candidates
 * already entered are billed when a fee is set, so a coach can enter people
 * first and price the grading afterwards.
 */
export async function setGradingFee(gradingId: string, fee: string) {
  await requireCoach();

  const parsed = parseFee(fee);

  await db
    .update(gradingEvents)
    .set({ fee: parsed })
    .where(eq(gradingEvents.id, gradingId));

  if (parsed) {
    const entered = await db
      .select({ userId: gradingCandidates.userId })
      .from(gradingCandidates)
      .where(eq(gradingCandidates.gradingId, gradingId));

    for (const candidate of entered) {
      await chargeCandidate(gradingId, candidate.userId);
    }
  }

  revalidatePath("/dashboard/coach/grading/[gradingId]", "page");
  revalidatePath("/dashboard/grading");
  revalidatePath("/dashboard/coach/grading");
  revalidatePath("/dashboard/payments");

  return { ok: true as const, fee: parsed };
}

export async function acceptGradingRequest(...args: Parameters<typeof acceptGradingRequestCore>) {
  const result = await acceptGradingRequestCore(...args);
  await afterAccountAction("acceptGradingRequest", args, result);
  return result;
}

export async function declineGradingRequest(...args: Parameters<typeof declineGradingRequestCore>) {
  const result = await declineGradingRequestCore(...args);
  await afterAccountAction("declineGradingRequest", args, result);
  return result;
}

export async function publishGrading(...args: Parameters<typeof publishGradingCore>) {
  const result = await publishGradingCore(...args);
  await afterAccountAction("publishGrading", args, result);
  return result;
}
