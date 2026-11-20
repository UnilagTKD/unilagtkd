import "server-only";
import { and, eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { db } from "@/db";
import { generateResetToken, resetTokenExpiry, storedToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/site-url";
import type { AttendanceDatabase } from "@/lib/attendance-periods";
import { securityLog } from "@/lib/security-log";
import { failureCode } from "@/lib/failure-code";

/** Same public result for unknown accounts and failed delivery. No raw token is returned. */
export async function queuePasswordReset(email: string, client: AttendanceDatabase = db, send = sendPasswordResetEmail) {
  let stage = "account_lookup";
  try {
    const [account] = await client.select({ id: users.id, email: users.email }).from(users)
      .where(and(eq(users.email, email), eq(users.status, "active"))).limit(1);
    if (!account) return;
    if (!process.env.RESEND_API_KEY) {
      stage = "record_manual_recovery";
      await client.update(users).set({ resetRequestedAt: new Date() }).where(eq(users.id, account.id));
      return;
    }
    const token = generateResetToken();
    const digest = storedToken(token);
    stage = "resolve_portal_origin";
    const base = await getBaseUrl();
    stage = "save_reset_token";
    await client.update(users).set({ resetRequestedAt: new Date(), resetToken: digest, resetTokenExpires: resetTokenExpiry(1) }).where(eq(users.id, account.id));
    stage = "send_reset_email";
    const result = await send(account.email, `${base}/reset-password?token=${token}`);
    if (result.ok) {
      stage = "clear_recovery_request";
      await client.update(users).set({ resetRequestedAt: null }).where(and(eq(users.id, account.id), eq(users.resetToken, digest)));
    }
  } catch (error) {
    securityLog("password_reset_pipeline_failed", { outcome: `${stage}:${failureCode(error)}` });
    throw error;
  }
}
