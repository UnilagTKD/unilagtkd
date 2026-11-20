"use server";

import { hash } from "bcryptjs";
import { eq, and, gt, isNull, inArray } from "drizzle-orm";
import { db } from "@/db";
import { applications, users } from "@/db/schema";
import { passwordStrengthError } from "@/lib/password-strength";
import { isValidToken, storedToken } from "@/lib/tokens";
import { requestRateLimit } from "@/lib/shared-rate-limit";
import { securityLog } from "@/lib/security-log";

export type CompleteSetupResult = { ok: true } | { ok: false; error: string };

export async function completeAccountSetup(
  token: string,
  password: string
): Promise<CompleteSetupResult> {
  if (!isValidToken(token) || !(await requestRateLimit("setup", 15, 15 * 60_000)).allowed) return { ok: false, error: "This setup link is invalid, expired, or temporarily unavailable." };
  const strengthError = passwordStrengthError(password);
  if (strengthError) {
    return { ok: false, error: strengthError };
  }

  const [application] = await db
    .select()
    .from(applications)
    .where(
      and(
        inArray(applications.setupToken, [storedToken(token), token]),
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

  const passwordHash = await hash(password, 12);

  const activated = await db.transaction(async (tx) => {
    const [claimed] = await tx.update(applications)
      .set({ setupToken: null, setupTokenExpires: null })
      .where(and(eq(applications.id, application.id), inArray(applications.setupToken, [storedToken(token), token]), gt(applications.setupTokenExpires, new Date())))
      .returning({ userId: applications.userId });
    if (!claimed?.userId) return false;
    const [updated] = await tx.update(users).set({ passwordHash })
      .where(and(eq(users.id, claimed.userId), isNull(users.passwordHash), eq(users.status, "active"))).returning({ id: users.id });
    return Boolean(updated);
  });
  if (!activated) return { ok: false, error: "This setup link is invalid or has expired." };
  securityLog("account_activated", { actorId: application.userId });

  return { ok: true };
}

export async function checkSetupToken(token: string) {
  if (!isValidToken(token) || !(await requestRateLimit("setup-check", 60, 15 * 60_000)).allowed) return null;
  const [application] = await db
    .select({
      fullName: applications.fullName,
    })
    .from(applications)
    .where(
      and(
        inArray(applications.setupToken, [storedToken(token), token]),
        gt(applications.setupTokenExpires, new Date()),
        eq(applications.status, "approved")
      )
    )
    .limit(1);

  return application ?? null;
}
