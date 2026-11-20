import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { monthlyReports, monthlyReportDeliveries, users } from "@/db/schema";
import { requireReportManager, monthlySnapshot, getReportExtras } from "@/lib/monthly-reports";
import { currentLagosMonth, lastReportMonth, reportPeriod } from "@/lib/report-period";
import { ReportRecipientForm } from "./recipient-form";
import { SendMonthlySummaryButton } from "./send-button";
export default async function MonthlyReportsPage({searchParams}:{searchParams:Promise<{month?:string}>}){
  try { await requireReportManager(); } catch { redirect("/dashboard"); }
  const input=(await searchParams).month||lastReportMonth();reportPeriod(input);if(input>=currentLagosMonth())throw new Error("Select a completed month.");
  const [saved]=await db.select().from(monthlyReports).where(eq(monthlyReports.month,input));
  const summary=saved?.summary||await monthlySnapshot(input);
  const [extra,reports,accounts,deliveries]=await Promise.all([getReportExtras(),db.select({month:monthlyReports.month}).from(monthlyReports).orderBy(desc(monthlyReports.month)).limit(36),db.select({email:users.email,role:users.role,position:users.excoPosition,status:users.status}).from(users),saved?db.select({email:monthlyReportDeliveries.email,status:monthlyReportDeliveries.status}).from(monthlyReportDeliveries).where(eq(monthlyReportDeliveries.reportId,saved.id)):[]]);
  const automatic=accounts.filter(account=>account.status==="active"&&(account.role==="coach"||account.position==="president"));
  return <div className="max-w-4xl space-y-6"><header><h1 className="text-2xl font-bold">Monthly summaries</h1><p className="mt-2 text-sm text-zinc-600">Completed-month club activity in Lagos time. A saved summary remains available for review. Automatic email sending runs on the first day of each month once the hosting schedule is deployed.</p></header>
    <ReportRecipientForm automatic={automatic.map(account=>account.email)} extra={extra} />
    <form className="flex flex-wrap items-end gap-3"><label className="text-sm">Report month<input type="month" name="month" defaultValue={input} max={lastReportMonth()} className="ml-3 rounded border p-2" /></label><button className="rounded-full border px-4 py-2 text-sm">View</button></form>
    <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">{input} {saved?"saved summary":"preview"}</h2><dl className="mt-4 divide-y">{Object.entries(summary).map(([label,value])=><div key={label} className="flex flex-wrap justify-between gap-4 py-2 text-sm"><dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl><p className="my-4 text-xs text-zinc-500">Collections include confirmed dues and confirmed registration payments, without counting the same registration twice. Attendance counts describe marked records, not eligibility thresholds.</p><SendMonthlySummaryButton month={input}/></section>
    {deliveries.length>0&&<section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Email submissions</h2>{deliveries.map(delivery=><p key={delivery.email} className="mt-2 break-all text-sm">{delivery.email}: {delivery.status==="sent"?"submitted":delivery.status}</p>)}</section>}
    <nav aria-label="Saved monthly summaries" className="flex flex-wrap gap-3 text-sm text-brand-blue">{reports.map(report=><Link key={report.month} href={`?month=${report.month}`}>{report.month}</Link>)}</nav>
  </div>;
}
