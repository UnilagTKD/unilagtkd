"use server";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { validate, recordId } from "@/lib/validation/actions";
import { deliverNotification } from "@/lib/notifications";
import { rateLimit } from "@/lib/shared-rate-limit";

export async function readNotification(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  validate(recordId, id);
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id), isNull(notifications.readAt)));
  revalidatePath("/dashboard", "layout");
}
export async function retryNotificationEmail(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  validate(recordId, id);
  if (!(await rateLimit(`notification-retry:${session.user.id}`, 5, 3600000)).allowed) throw new Error("Please try again later.");
  await deliverNotification(id, session.user.id);
  revalidatePath("/dashboard/notifications");
}
