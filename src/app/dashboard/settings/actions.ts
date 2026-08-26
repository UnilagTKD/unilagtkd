"use server";

import { compare, hash } from "bcryptjs";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, memberProfiles } from "@/db/schema";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

export async function updateOwnProfile(data: {
  phone?: string;
  address?: string;
  avatarUrl?: string;
  username?: string;
  beltGrade?: string;
}): Promise<ActionResult> {
  const user = await requireUser();

  const username = data.username?.trim() || "";

  if (username) {
    if (!USERNAME_PATTERN.test(username)) {
      return {
        ok: false,
        error: "Username must be 3-30 characters: letters, numbers, and underscores only.",
      };
    }

    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.username, username), ne(users.id, user.id)))
      .limit(1);

    if (taken) {
      return { ok: false, error: "That username is already taken." };
    }
  }

  await db
    .update(users)
    .set({ username: username || null })
    .where(eq(users.id, user.id));

  await db
    .update(memberProfiles)
    .set({
      phone: data.phone || null,
      address: data.address || null,
      avatarUrl: data.avatarUrl || null,
      beltGrade: data.beltGrade || null,
    })
    .where(eq(memberProfiles.userId, user.id));

  revalidatePath("/dashboard/settings");
  revalidatePath(`/dashboard/${user.role}`);
  return { ok: true };
}

export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  const user = await requireUser();

  if (newPassword.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters." };
  }

  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!row?.passwordHash) {
    return { ok: false, error: "Account not found." };
  }

  const valid = await compare(currentPassword, row.passwordHash);
  if (!valid) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const newHash = await hash(newPassword, 10);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

  return { ok: true };
}
