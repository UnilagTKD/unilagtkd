import "server-only";
import { and, eq, inArray, sql, or } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { sendNotificationEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/site-url";
import { securityLog } from "@/lib/security-log";

export async function deliverNotification(id: string, userId: string) {
  // Atomic claim prevents concurrent retries sending the same notification.
  const [item] = await db.update(notifications).set({ emailStatus: "sending", emailClaimedAt: new Date(), emailAttempts: sql`${notifications.emailAttempts}+1` })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId), or(inArray(notifications.emailStatus, ["pending", "failed"]), and(eq(notifications.emailStatus, "sending"), sql`${notifications.emailClaimedAt} < now()-interval '5 minutes'`))))
    .returning();
  if (!item) return;
  try {
    const [recipient] = await db.select({ email: users.email, status: users.status }).from(users).where(eq(users.id, userId));
    if (!recipient) {
      await db.update(notifications).set({ emailStatus: "skipped" }).where(eq(notifications.id, id)); return;
    }
    const link = new URL(item.href, await getBaseUrl()).href;
    const result = await sendNotificationEmail(recipient.email, item.title, item.message, link, `notification/${item.id}`);
    await db.update(notifications).set({ emailStatus: result.ok ? "sent" : "failed" }).where(eq(notifications.id, id));
  } catch {
    await db.update(notifications).set({ emailStatus: "failed" }).where(eq(notifications.id, id));
    securityLog("notification_email_failed");
  }
}

export async function notifyUser(input: { userId: string; eventKey: string; title: string; message: string; href: string; email?: boolean; emailState?: "sent" | "failed" | "skipped" }) {
  try {
    if (input.href !== "/dashboard" && !input.href.startsWith("/dashboard/")) throw new Error("Invalid notification destination");
    const [item] = await db.insert(notifications).values({ userId: input.userId, eventKey: input.eventKey, title: input.title, message: input.message, href: input.href, emailStatus: input.email === false ? input.emailState || "skipped" : "pending" })
      .onConflictDoNothing().returning({ id: notifications.id });
    if (item && input.email !== false) await deliverNotification(item.id, input.userId);
  } catch { securityLog("notification_record_failed"); }
}

export async function notifyReviewers(roles: ("admin" | "coach" | "exco")[], eventKey: string, title: string, message: string, href: string, actorId?: string, treasurerOnly = false) {
  const reviewers = await db.select({ id: users.id, position: users.excoPosition }).from(users).where(and(eq(users.status, "active"), inArray(users.role, roles)));
  // Bound concurrent provider requests; failures remain visible for retry.
  for (const reviewer of reviewers) if (reviewer.id !== actorId && (!treasurerOnly || reviewer.position === "treasurer")) {
    await notifyUser({ userId: reviewer.id, eventKey, title, message, href });
  }
}
