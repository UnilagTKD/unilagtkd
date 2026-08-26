"use server";

import { hash } from "bcryptjs";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { applications, users } from "@/db/schema";

export type CompleteSetupResult = { ok: true } | { ok: false; error: string };

export async function completeAccountSetup(
  token: string,
  password: string
): Promise<CompleteSetupResult> {
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const [application] = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.setupToken, token),
        gt(applications.setupTokenExpires, new Date()),
        eq(applications.status, "approved")
      )
    )
    .limit(1);

  if (!application || !application.userId) {
    return { ok: false, error: "This setup link is invalid or has expired." };
  }

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, application.userId))
    .limit(1);

  if (user?.passwordHash) {
    return { ok: false, error: "This account has already been activated. Please log in." };
  }

  const passwordHash = await hash(password, 10);

  await db.update(users).set({ passwordHash }).where(eq(users.id, application.userId));
  await db
    .update(applications)
    .set({ setupToken: null, setupTokenExpires: null })
    .where(eq(applications.id, application.id));

  return { ok: true };
}

export async function checkSetupToken(token: string) {
  const [application] = await db
    .select({
      fullName: applications.fullName,
      email: applications.email,
    })
    .from(applications)
    .where(
      and(
        eq(applications.setupToken, token),
        gt(applications.setupTokenExpires, new Date()),
        eq(applications.status, "approved")
      )
    )
    .limit(1);

  return application ?? null;
}
