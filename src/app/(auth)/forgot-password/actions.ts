"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Records a password reset request against the account, if it exists.
 *
 * The club has no outbound email, so this deliberately does NOT issue a reset
 * link. It only flags the account so the General Secretary sees the request,
 * verifies who the person is, and hands them a link directly.
 *
 * Always returns the same result whether or not the email is registered -
 * otherwise this endpoint tells an attacker which addresses have accounts.
 */
export async function requestPasswordReset(email: string) {
  const normalized = email.trim().toLowerCase();

  if (normalized) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);

    if (user) {
      await db
        .update(users)
        .set({ resetRequestedAt: new Date() })
        .where(eq(users.id, user.id));
    }
  }

  return { ok: true as const };
}
