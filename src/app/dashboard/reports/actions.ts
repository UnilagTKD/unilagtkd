"use server";
import { z } from "zod";
import { db } from "@/db";
import { clubSettings } from "@/db/schema";
import { requireReportManager, sendMonthlyReport } from "@/lib/monthly-reports";
import { rateLimit } from "@/lib/shared-rate-limit";
import { revalidatePath } from "next/cache";
export async function saveMonthlyReportEmails(form: FormData | string) {
  const user = await requireReportManager();
  if (!(await rateLimit(`report-settings:${user.id}`, 10, 3600000)).allowed) throw new Error("Please try again later.");
  const input = typeof form === "string" ? form : String(form.get("emails") || "");
  if (input.length > 3000) throw new Error("Enter at most 10 extra email addresses.");
  const emails = z.array(z.string().email().max(255)).max(10).parse([...new Set(input.split(/[,;\s]+/).filter(Boolean).map(email => email.toLowerCase()))]);
  await db.insert(clubSettings).values({ key: "monthly-report-emails", value: { emails } }).onConflictDoUpdate({ target: clubSettings.key, set: { value: { emails } } });
  revalidatePath("/dashboard/reports");
}
export async function sendMonthlySummary(month: string) {
  const user = await requireReportManager();
  if (!(await rateLimit(`report-send:${user.id}`, 5, 3600000)).allowed) throw new Error("Please try again later.");
  const result = await sendMonthlyReport(month);
  revalidatePath("/dashboard/reports");
  return { ok: true, ...result };
}
