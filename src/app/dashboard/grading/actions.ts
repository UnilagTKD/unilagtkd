"use server";
import { afterAccountAction } from "@/lib/action-notifications";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { gradingRequests } from "@/db/schema";
import type { UserRole } from "@/types/next-auth";
import { MEMBER_PAGE_ROLES } from "@/lib/roles";
import { checkEligibility, beltById } from "@/lib/grading";
import { getGradingWindow, loadEligibilityContext } from "@/lib/grading-data";
import { validate, recordId, reviewNote } from "@/lib/validation/actions";
import { rateLimit } from "@/lib/shared-rate-limit";

async function requireMember() {
  const session = await auth();
  const allowed: UserRole[] = [...MEMBER_PAGE_ROLES];
  if (!session?.user || !allowed.includes(session.user.role)) {
    throw new Error("Not authorized");
  }
  return session.user;
}

function revalidateGradingRequests() {
  revalidatePath("/dashboard/grading");
  revalidatePath("/dashboard/coach/grading");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/alumni");
}

/**
 * A member's self-nomination for grading. Only permitted while a window is
 * open, and only for a belt their own rank actually permits - a coach still
 * re-checks eligibility before accepting, but there is no reason to accept a
 * request for a belt the ladder does not allow at all.
 */
async function requestGradingCore(targetBeltId: string, note?: string) {
  const user = await requireMember();
  note = validate(reviewNote, note);
  if (typeof targetBeltId !== "string" || targetBeltId.length > 50) throw new Error("Unknown target belt.");
  if (!(await rateLimit(`grading-request:${user.id}`, 10, 60 * 60_000)).allowed) throw new Error("Too many requests. Please try again later.");

  const { state } = await getGradingWindow();
  if (!state.open) {
    throw new Error("Grading is not currently open, so a request cannot be made.");
  }

  const context = await loadEligibilityContext(user.id);
  if (!context) throw new Error("Your member profile is not set up yet.");

  const target = beltById(targetBeltId);
  if (!target) throw new Error("Unknown target belt");

  const verdict = checkEligibility({ ...context, target });
  if (!verdict.promotion) {
    throw new Error(verdict.blockers.map((b) => b.message).join(" "));
  }

  const [existing] = await db
    .select({ id: gradingRequests.id })
    .from(gradingRequests)
    .where(and(eq(gradingRequests.userId, user.id), eq(gradingRequests.status, "pending")))
    .limit(1);

  if (existing) {
    throw new Error(
      "You already have a grading request awaiting review. Withdraw it before making another."
    );
  }

  await db.insert(gradingRequests).values({
    userId: user.id,
    targetBeltId,
    note: note?.trim() || null,
  });

  revalidateGradingRequests();
}

/** Cancels a request the member made themselves, while it is still pending. */
export async function withdrawGradingRequest(requestId: string) {
  const user = await requireMember();
  validate(recordId, requestId);

  const [request] = await db
    .select({ userId: gradingRequests.userId, status: gradingRequests.status })
    .from(gradingRequests)
    .where(eq(gradingRequests.id, requestId))
    .limit(1);

  if (!request || request.userId !== user.id) {
    throw new Error("Request not found");
  }
  if (request.status !== "pending") {
    throw new Error("Only a pending request can be withdrawn.");
  }

  await db.delete(gradingRequests).where(and(eq(gradingRequests.id, requestId), eq(gradingRequests.userId, user.id), eq(gradingRequests.status, "pending")));

  revalidateGradingRequests();
}

export async function requestGrading(...args: Parameters<typeof requestGradingCore>) {
  const result = await requestGradingCore(...args);
  await afterAccountAction("requestGrading", args, result);
  return result;
}
