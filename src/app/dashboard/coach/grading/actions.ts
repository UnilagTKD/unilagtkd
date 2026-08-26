"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  memberProfiles,
  gradingWindows,
  gradingEvents,
  gradingCandidates,
  gradingRequests,
  dues,
} from "@/db/schema";
import type { UserRole } from "@/types/next-auth";
import {
  addDays,
  assessGrading,
  buildPromotion,
  checkEligibility,
  criteriaFor,
  gradingWindowState,
  beltById,
  isPromoting,
  rankById,
  suggestedAward,
  rankLabel,
  resolveRank,
  toDateInput,
  DEFAULT_WINDOW_DAYS,
  type CriterionScores,
  type Rank,
} from "@/lib/grading";
import { getGradingWindow, loadEligibilityContext } from "@/lib/grading-data";

// Server actions are reachable by direct POST, not only through the dashboard,
// so every one of them re-checks the caller's role. `@/lib/session` exports a
// `requireRole` that redirects, which is right for pages and wrong here.
async function requireCoach() {
  const session = await auth();
  const allowed: UserRole[] = ["coach"];
  if (!session?.user || !allowed.includes(session.user.role)) {
    throw new Error("Not authorized");
  }
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
  if (!Number.isFinite(value) || value < 0) {
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

export async function createGrading(data: {
  title: string;
  date: string;
  location?: string;
  notes?: string;
  fee?: string;
}) {
  const user = await requireCoach();
  await requireOpenWindow();

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

  revalidatePath("/dashboard/coach/grading");
  revalidatePath(`/dashboard/coach/grading/${gradingId}`);
}

async function loadOpenGrading(gradingId: string) {
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
 * Eligibility is re-checked here against live attendance and dues. A blocked
 * member can still be entered, but only with `overrideReason` filled in: the
 * reason is stored on the record and shown beside the result, so a discretionary
 * entry is always visible as one.
 */
export async function registerGradingCandidate(data: {
  gradingId: string;
  userId: string;
  targetBeltId: string;
  overrideReason?: string;
}) {
  await requireCoach();
  await requireOpenWindow();

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

  if (!verdict.eligible && !override) {
    throw new Error(
      `${context.fullName} does not meet the requirements for ${target.name}: ${verdict.blockers
        .map((b) => b.message)
        .join(" ")} Record an override reason to enter them anyway.`
    );
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

  revalidatePath(`/dashboard/coach/grading/${data.gradingId}`);
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

  revalidatePath(`/dashboard/coach/grading/${candidate.gradingId}`);
}

// ---------------------------------------------------------------------------
// Self-nominations (student/alumni requests to be graded)
// ---------------------------------------------------------------------------

async function loadPendingRequest(requestId: string) {
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
 */
export async function acceptGradingRequest(data: {
  requestId: string;
  gradingId: string;
  overrideReason?: string;
}) {
  const user = await requireCoach();
  const request = await loadPendingRequest(data.requestId);

  const created = await registerGradingCandidate({
    gradingId: data.gradingId,
    userId: request.userId,
    targetBeltId: request.targetBeltId,
    overrideReason: data.overrideReason,
  });

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
  revalidatePath(`/dashboard/coach/grading/${data.gradingId}`);
  revalidatePath("/dashboard/grading");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");
}

export async function declineGradingRequest(requestId: string, reviewNote?: string) {
  const user = await requireCoach();
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

/**
 * Records the panel's marks and recomputes the outcome.
 *
 * The total and the decision are derived here rather than accepted from the
 * client - the form posts marks, never a verdict. Scores for criteria that this
 * rank does not examine are discarded.
 */
export async function saveCandidateScores(data: {
  candidateId: string;
  scores: CriterionScores;
  examinerNotes?: string;
  /**
   * The geup to award inside the target belt. The panel's call, not the
   * system's - so it is accepted from the form, unlike the outcome. Only
   * validated to be a grade that actually belongs to the belt being graded to.
   */
  awardedRankId?: string | null;
}) {
  const user = await requireCoach();

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

  const promotion = promotionForCandidate(candidate.fromRank, candidate.toBelt);
  const examined = criteriaFor(promotion.to).map((c) => c.id);

  // Only keep marks for criteria this rank is actually examined on.
  const scores: CriterionScores = {};
  for (const id of examined) {
    const value = data.scores[id];
    scores[id] = typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  const assessment = assessGrading(promotion, scores);

  // The awarded geup only means something on a pass. A candidate who did not
  // pass keeps their existing rank, so there is nothing to record.
  let awardedRank: string | null = null;
  if (isPromoting(assessment.outcome)) {
    const chosen = data.awardedRankId
      ? promotion.awardable.find((r) => r.id === data.awardedRankId)
      : undefined;

    if (data.awardedRankId && !chosen) {
      throw new Error(
        `${data.awardedRankId} is not a grade within ${promotion.to.name}. Choose one of: ${promotion.awardable
          .map((r) => r.grade)
          .join(", ")}.`
      );
    }

    // Fall back to the standard award for the result if the panel has not
    // picked one yet, so a saved pass is never left without a grade.
    awardedRank = (chosen ?? suggestedAward(promotion, assessment.outcome))?.id ?? null;
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
      totalScore: assessment.complete ? assessment.total.toFixed(2) : null,
      outcome: assessment.outcome,
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

  revalidatePath(`/dashboard/coach/grading/${candidate.gradingId}`);

  return {
    outcome: assessment.outcome,
    total: assessment.total,
    complete: assessment.complete,
    summary: assessment.summary,
    awardedRank,
  };
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

  const candidate = await loadCandidate(candidateId);
  if (candidate.gradingStatus === "published") {
    throw new Error("A published grading can no longer be changed");
  }

  await db
    .update(gradingCandidates)
    .set({
      outcome: state === "reinstate" ? "pending" : state,
      scoreBasics: null,
      scorePoomsae: null,
      scoreKyorugi: null,
      scoreKyukpa: null,
      scoreHoshinsul: null,
      scoreTheory: null,
      totalScore: null,
      examinedAt: null,
      examinedBy: null,
    })
    .where(eq(gradingCandidates.id, candidateId));

  revalidatePath(`/dashboard/coach/grading/${candidate.gradingId}`);
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
export async function publishGrading(gradingId: string) {
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

    // The grade the panel awarded inside the target belt. Falls back to the
    // standard award for the outcome if a record predates that choice.
    const belt = beltById(candidate.toBelt);
    const from = rankById(candidate.fromRank);
    const target =
      rankById(candidate.awardedRank) ??
      (belt && from
        ? suggestedAward(buildPromotion(from, belt), candidate.outcome)
        : null);
    if (!target) continue;

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

  revalidatePath("/dashboard/coach/grading");
  revalidatePath(`/dashboard/coach/grading/${gradingId}`);
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

  revalidatePath(`/dashboard/coach/grading/${gradingId}`);
  revalidatePath("/dashboard/coach/grading");
  revalidatePath("/dashboard/payments");

  return { ok: true as const, fee: parsed };
}
