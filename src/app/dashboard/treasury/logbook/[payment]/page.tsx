import { IssueReceiptButton } from "@/app/dashboard/exco/issue-receipt-button";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { dues, gradingEvents, memberProfiles, users } from "@/db/schema";
import { getExcoContext } from "@/lib/session";
import { recordIdFromSlug, recordSlug } from "@/lib/record-slug";
import { naira } from "@/lib/currency";
const recorder = alias(users, "logbook_recorder");
const decliner = alias(users, "logbook_decliner");
const date = (value: Date | null) => value ? value.toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }) : "Not recorded";

export default async function LogbookEntryPage({ params }: { params: Promise<{ payment: string }> }) {
  const context = await getExcoContext();
  if (!context.can("dues:manage")) redirect(`/dashboard/${context.user.role}`);
  const { payment } = await params;
  const id = recordIdFromSlug(payment); if (!id) notFound();
  const [entry] = await db.select({ payment: dues, name: memberProfiles.fullName, email: users.email, confirmedBy: recorder.email, declinedBy: decliner.email, gradingTitle: gradingEvents.title }).from(dues)
    .innerJoin(users, eq(users.id, dues.userId)).leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .leftJoin(recorder, eq(recorder.id, dues.recordedBy)).leftJoin(decliner, eq(decliner.id, dues.paymentDeclinedBy)).leftJoin(gradingEvents, eq(gradingEvents.id, dues.gradingId)).where(eq(dues.id, id)).limit(1);
  if (!entry) notFound();
  const item = entry.payment;
  const rows: [string, string][] = [["Member", entry.name ?? entry.email], ["Email", entry.email], ["Payment purpose", item.periodLabel], ["Amount", naira.format(Number(item.amount))], ["Status", item.paid ? "Confirmed payment" : item.paymentClaimed ? "Claim awaiting verification" : "Unpaid charge"], ["Reference", item.paymentReference ?? "Not supplied"], ["Receipt number", item.receiptNo ?? "Not issued"], ["Grading event", entry.gradingTitle ?? "Not a grading charge"], ["Charge / report created", date(item.createdAt)], ["Last payment claim", date(item.paymentClaimedAt)], ["Payment confirmed", date(item.paidAt)], ["Confirmed by", entry.confirmedBy ?? "Not recorded"], ["Last claim declined", date(item.paymentDeclinedAt)], ["Declined by", entry.declinedBy ?? "Not recorded"], ["Decline reason", item.paymentDeclineReason ?? "Not applicable"]];
  return <div className="max-w-3xl space-y-6"><Link href="/dashboard/treasury/logbook" className="text-sm font-medium text-brand-blue">&larr; Treasurer logbook</Link><header><h1 className="text-2xl font-bold">{item.periodLabel}</h1><p className="mt-1 text-sm text-zinc-500">Payment details · All dates shown in Africa/Lagos</p></header><dl className="grid gap-5 rounded-xl border border-black/10 bg-white p-4 sm:grid-cols-2 sm:p-6">{rows.map(([label,value]) => <div key={label} className="min-w-0"><dt className="text-xs text-zinc-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}</dl>{item.paid && !item.receiptNo && <IssueReceiptButton duesId={item.id} />}{item.paid && item.receiptNo && <Link href={`/dashboard/receipts/${recordSlug(item.periodLabel, item.id)}`} className="inline-block rounded-full bg-brand-blue px-5 py-2 text-sm font-semibold text-white">Open receipt</Link>}</div>;
}
