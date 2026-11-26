import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { memberProfiles, users } from "@/db/schema";
import { excoPermissions, type ExcoPermission } from "@/lib/exco";
import type { UserRole } from "@/types/next-auth";
import { rateLimit } from "@/lib/shared-rate-limit";
import { securityLog } from "@/lib/security-log";

export const getSession = cache(async () => auth());

export const getPortalAccount = cache(async (userId: string) => {
  const [account] = await db
    .select({ username: users.username, fullName: memberProfiles.fullName, position: users.excoPosition })
    .from(users).leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .where(eq(users.id, userId)).limit(1);
  return account;
});

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!allowedRoles.includes(session.user.role)) {
    redirect(`/dashboard/${session.user.role}`);
  }

  return session.user;
}

/**
 * Loads the signed-in user together with their exco office and the permissions
 * it grants. The office is read from the database rather than the JWT so that
 * a re-assignment takes effect without the officer signing out and back in.
 */
export async function getExcoPosition(userId: string) {
  const [row] = await db
    .select({ excoPosition: users.excoPosition })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row?.excoPosition ?? null;
}

export async function getExcoContext() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const position = (await getPortalAccount(session.user.id))?.position ?? null;
  const permissions = excoPermissions(session.user.role, position);

  return {
    user: session.user,
    position,
    can: (permission: ExcoPermission) => permissions.includes(permission),
  };
}

/** Server-action guard: throws unless the caller's office grants `permission`. */
export async function requireAdmissionPaymentReviewer() {
  const session = await auth();
  if (session?.user.role === "admin") {
    if (!(await rateLimit(`office-action:${session.user.id}`, 120, 60_000)).allowed) throw new Error("Too many requests. Please try again later.");
    return session.user;
  }
  return requireExcoPermission("dues:manage");
}

export async function requireExcoPermission(permission: ExcoPermission) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const [row] = await db
    .select({ excoPosition: users.excoPosition })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!excoPermissions(session.user.role, row?.excoPosition ?? null).includes(permission)) {
    securityLog("office_authorization_denied", { actorId: session.user.id });
    throw new Error("Not authorized");
  }
  if (!(await rateLimit(`office-action:${session.user.id}`, 120, 60_000)).allowed) throw new Error("Too many requests. Please try again later.");

  return session.user;
}
