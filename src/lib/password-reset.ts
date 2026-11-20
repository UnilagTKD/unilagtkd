import "server-only";
import { and, eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { db } from "@/db";
import { generateResetToken, resetTokenExpiry, storedToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/site-url";
import type { AttendanceDatabase } from "@/lib/attendance-periods";

/** Same public result for unknown accounts and failed delivery. No raw token is returned. */
export async function queuePasswordReset(email: string, client: AttendanceDatabase = db, send = sendPasswordResetEmail) {
  const [account] = await client.select({ id: users.id, email: users.email }).from(users)
    .where(and(eq(users.email, email), eq(users.status, "active"))).limit(1);
  if (!account) return;
  if (!process.env.RESEND_API_KEY) {
    await client.update(users).set({ resetRequestedAt: new Date() }).where(eq(users.id, account.id));
    return;
  }
  const token = generateResetToken();
  const digest = storedToken(token);
  const base = await getBaseUrl();
  await client.update(users).set({ resetRequestedAt: new Date(), resetToken: digest, resetTokenExpires: resetTokenExpiry(1) }).where(eq(users.id, account.id));
  const result = await send(account.email, `${base}/reset-password?token=${token}`);
  if (result.ok) await client.update(users).set({ resetRequestedAt: null }).where(and(eq(users.id, account.id), eq(users.resetToken, digest)));
}
