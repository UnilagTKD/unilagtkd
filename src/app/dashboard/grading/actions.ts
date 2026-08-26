"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { gradingRequests } from "@/db/schema";
import type { UserRole } from "@/types/next-auth";
import { MEMBER_ROLES } from "@/lib/roles";
import { checkEligibility, beltById } from "@/lib/grading";
import { getGradingWindow, loadEligibilityContext } from "@/lib/grading-data";

async function requireMember() {
  const session = await auth();
  const allowed: UserRole[] = [...MEMBER_ROLES];
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
export async function requestGrading(targetBeltId: string, note?: string) {
  const user = await requireMember();

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

  await db.delete(gradingRequests).where(eq(gradingRequests.id, requestId));

  revalidateGradingRequests();
}
