import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { excoPermissions, type ExcoPermission } from "@/lib/exco";
import type { UserRole } from "@/types/next-auth";

export async function getSession() {
  return auth();
}

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await auth();

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
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const position = await getExcoPosition(session.user.id);
  const permissions = excoPermissions(session.user.role, position);

  return {
    user: session.user,
    position,
    can: (permission: ExcoPermission) => permissions.includes(permission),
  };
}

/** Server-action guard: throws unless the caller's office grants `permission`. */
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
    throw new Error("Not authorized");
  }

  return session.user;
}
