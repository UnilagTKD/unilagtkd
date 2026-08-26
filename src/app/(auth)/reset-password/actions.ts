"use server";

import { hash } from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export type CompleteResetResult = { ok: true } | { ok: false; error: string };

export async function checkResetToken(token: string) {
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.resetToken, token), gt(users.resetTokenExpires, new Date())))
    .limit(1);

  return user ?? null;
}

export async function completePasswordReset(
  token: string,
  password: string
): Promise<CompleteResetResult> {
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.resetToken, token), gt(users.resetTokenExpires, new Date())))
    .limit(1);

  if (!user) {
    return { ok: false, error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await hash(password, 10);

  // Clear the token and the pending request together, so the link is single-use
  // and the request drops off the Secretary's queue.
  await db
    .update(users)
    .set({
      passwordHash,
      resetToken: null,
      resetTokenExpires: null,
      resetRequestedAt: null,
    })
    .where(eq(users.id, user.id));

  return { ok: true };
}
