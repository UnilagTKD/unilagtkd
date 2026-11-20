import "server-only";
import { and, eq, inArray, sql, or } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { clubSettings, monthlyReports, monthlyReportDeliveries, users } from "@/db/schema";
import { sendNotificationEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";
import { getBaseUrl } from "@/lib/site-url";
import { currentLagosMonth, lastReportMonth, reportPeriod } from "@/lib/report-period";
import { z } from "zod";

export async function requireReportManager() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const [account] = await db.select({ position: users.excoPosition }).from(users).where(eq(users.id, session.user.id));
  if (!["admin", "coach"].includes(session.user.role) && account?.position !== "president") throw new Error("Only the president, coach, or admin can manage monthly reports.");
  return session.user;
}
export async function getReportExtras() {
  const [setting] = await db.select().from(clubSettings).where(eq(clubSettings.key, "monthly-report-emails"));
  const parsed = z.array(z.string().email()).max(10).safeParse(setting?.value.emails || []);
  return parsed.success ? parsed.data : [];
}
export async function monthlySnapshot(month: string) {
  if (month >= currentLagosMonth()) throw new Error("Reports are available only for completed months.");
  const p = reportPeriod(month);
  const [row] = await db.execute<{ applications: number; approved: number; sessions: number; present: number; marked: number; leave: number; grading: number; collected: string; verifiedReceipts: number }>(sql`
    select
      (select count(*)::int from applications where created_at>=${p.start.toISOString()} and created_at<${p.end.toISOString()}) as applications,
      (select count(*)::int from applications where status='approved' and reviewed_at>=${p.start.toISOString()} and reviewed_at<${p.end.toISOString()}) as approved,
      (select count(*)::int from training_sessions where date>=${p.startDay}::date and date<${p.endDay}::date) as sessions,
      (select count(*)::int from attendance a join training_sessions s on a.session_id=s.id where a.present and s.date>=${p.startDay}::date and s.date<${p.endDay}::date) as present,
      (select count(*)::int from attendance a join training_sessions s on a.session_id=s.id where s.date>=${p.startDay}::date and s.date<${p.endDay}::date) as marked,
      (select count(*)::int from leave_requests where created_at>=${p.start.toISOString()} and created_at<${p.end.toISOString()}) as leave,
      (select count(*)::int from grading_events where status='published' and published_at>=${p.start.toISOString()} and published_at<${p.end.toISOString()}) as grading,
      ((select coalesce(sum(amount),0) from dues where paid and paid_at>=${p.start.toISOString()} and paid_at<${p.end.toISOString()})+
       (select coalesce(sum(semester_dues),0) from applications where user_id is null and admission_payment_status='confirmed' and admission_payment_reviewed_at>=${p.start.toISOString()} and admission_payment_reviewed_at<${p.end.toISOString()}))::text as collected,
      (select count(*)::int from applications where admission_payment_status='confirmed' and admission_payment_reviewed_at>=${p.start.toISOString()} and admission_payment_reviewed_at<${p.end.toISOString()}) as "verifiedReceipts"
  `);
  return { "Month (Lagos time)": month, "Applications received": row.applications, "Accounts approved": row.approved, "Training sessions": row.sessions, "Attendance marked present": row.present, "Attendance records marked": row.marked, "Leave requests received": row.leave, "Gradings published": row.grading, "Registration payments verified": row.verifiedReceipts, "Confirmed collections (NGN)": Number(row.collected).toFixed(2) };
}

export async function sendMonthlyReport(month = lastReportMonth()) {
  const summary = await monthlySnapshot(month);
  await db.insert(monthlyReports).values({ month, summary }).onConflictDoNothing();
  const [report] = await db.select().from(monthlyReports).where(eq(monthlyReports.month, month));
  const accounts = await db.select({ id: users.id, email: users.email }).from(users).where(and(eq(users.status, "active"), or(eq(users.role, "coach"), eq(users.excoPosition, "president"))));
  const recipients = new Set([...accounts.map(a => a.email), ...await getReportExtras()].map(email => email.trim().toLowerCase()));
  if (recipients.size) await db.insert(monthlyReportDeliveries).values([...recipients].map(email => ({ reportId: report.id, email }))).onConflictDoNothing();
  const link = `${await getBaseUrl()}/dashboard/reports?month=${month}`;
  const message = Object.entries(report.summary).map(([key,value]) => `${key}: ${value}`).join("\n");
  const pending = await db.select().from(monthlyReportDeliveries).where(and(eq(monthlyReportDeliveries.reportId, report.id), inArray(monthlyReportDeliveries.email, [...recipients])));
  let submitted = 0;
  for (const delivery of pending) {
    const [claim] = await db.update(monthlyReportDeliveries).set({ status: "sending", claimedAt: new Date() }).where(and(eq(monthlyReportDeliveries.id, delivery.id), or(inArray(monthlyReportDeliveries.status, ["pending", "failed"]), and(eq(monthlyReportDeliveries.status, "sending"), sql`${monthlyReportDeliveries.claimedAt}<now()-interval '5 minutes'`)))).returning({ id: monthlyReportDeliveries.id });
    if (!claim) continue;
    const result = await sendNotificationEmail(delivery.email, `UNILAG Taekwondo monthly summary: ${month}`, message, link, `notification/monthly-report/${delivery.id}`);
    await db.update(monthlyReportDeliveries).set({ status: result.ok ? "sent" : "failed" }).where(eq(monthlyReportDeliveries.id, delivery.id));
    if (result.ok) submitted++;
  }
  for (const account of accounts) await notifyUser({ userId: account.id, eventKey: `monthly-report:${report.id}`, title: "Monthly summary available", message: `The club summary for ${month} is ready.`, href: `/dashboard/reports?month=${month}`, email: false });
  return { id: report.id, month, recipients: recipients.size, submitted };
}

