"use server";

import { hash } from "bcryptjs";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users, memberProfiles } from "@/db/schema";
import { passwordStrengthError } from "@/lib/password-strength";
import { sendPasswordChangedEmail } from "@/lib/email";
import { isValidToken, storedToken } from "@/lib/tokens";
import { requestRateLimit } from "@/lib/shared-rate-limit";
import { securityLog } from "@/lib/security-log";

export type CompleteResetResult = { ok: true } | { ok: false; error: string };

export async function checkResetToken(token: string) {
  if (!isValidToken(token) || !(await requestRateLimit("reset-check", 60, 15 * 60_000)).allowed) return null;
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(and(inArray(users.resetToken, [storedToken(token), token]), gt(users.resetTokenExpires, new Date()), eq(users.status, "active")))
    .limit(1);

  return user ?? null;
}

export async function completePasswordReset(
  token: string,
  password: string
): Promise<CompleteResetResult> {
  if (!isValidToken(token) || !(await requestRateLimit("reset", 15, 15 * 60_000)).allowed) return { ok: false, error: "This reset link is invalid, expired, or temporarily unavailable." };
  const strengthError = passwordStrengthError(password);
  if (strengthError) {
    return { ok: false, error: strengthError };
  }

  const [user] = await db
    .select({ id: users.id, email: users.email, fullName: memberProfiles.fullName })
    .from(users)
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .where(and(inArray(users.resetToken, [storedToken(token), token]), gt(users.resetTokenExpires, new Date()), eq(users.status, "active")))
    .limit(1);

  if (!user) {
    return { ok: false, error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await hash(password, 12);

  // Clear the token and the pending request together, so the link is single-use
  // and the request drops off the Secretary's queue.
  const [updated] = await db
    .update(users)
    .set({
      passwordHash,
      resetToken: null,
      resetTokenExpires: null,
      resetRequestedAt: null,
    })
    .where(and(eq(users.id, user.id), inArray(users.resetToken, [storedToken(token), token]), gt(users.resetTokenExpires, new Date()), eq(users.status, "active"))).returning({ id: users.id });
  if (!updated) return { ok: false, error: "This reset link is invalid or has expired." };
  securityLog("password_reset", { actorId: user.id });

  await sendPasswordChangedEmail(user.email, user.fullName ?? user.email);

  return { ok: true };
}
