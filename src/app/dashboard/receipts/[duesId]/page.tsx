import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { dues, users, memberProfiles } from "@/db/schema";
import { requireExcoPermission } from "@/lib/session";
import { PrintButton } from "./print-button";

/* Official receipt UTC-R. Rendered from the dues row the Treasurer issued
   against, so the number here is the one on record - nothing is recomputed. */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex border-b border-zinc-200 py-2 last:border-b-0">
      <div className="w-44 flex-none text-[11px] font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="text-sm text-black">{value}</div>
    </div>
  );
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ duesId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { duesId } = await params;

  const [row] = await db
    .select({
      id: dues.id,
      userId: dues.userId,
      amount: dues.amount,
      periodLabel: dues.periodLabel,
      paid: dues.paid,
      paidAt: dues.paidAt,
      receiptNo: dues.receiptNo,
      paymentReference: dues.paymentReference,
      memberName: memberProfiles.fullName,
      memberEmail: users.email,
      matricOrStaffNo: memberProfiles.matricOrStaffNo,
    })
    .from(dues)
    .innerJoin(users, eq(users.id, dues.userId))
    .leftJoin(memberProfiles, eq(memberProfiles.userId, dues.userId))
    .where(eq(dues.id, duesId))
    .limit(1);

  if (!row) notFound();

  // The member may see their own; anyone else needs the finance permission.
  if (row.userId !== session.user.id) {
    await requireExcoPermission("dues:view");
  }

  // Nothing to show until the Treasurer has actually issued against it.
  if (!row.paid || !row.receiptNo) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-brand-black">Receipt</h1>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No receipt has been issued for this charge yet. The Treasurer issues one once
          your payment has been verified.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-brand-black">Receipt {row.receiptNo}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Official club receipt. Print or save a copy for your records.
        </p>
        <div className="mt-4">
          <PrintButton />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-black/10 bg-white p-8 text-black print:mt-0 print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-6 border-b-2 border-[#1e3a5f] pb-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/unilag-logo.png" alt="" className="h-12 w-12 object-contain" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/club-logo.png" alt="" className="h-12 w-12 object-contain" />
            <div>
              <div className="text-lg font-bold tracking-tight text-[#1e3a5f]">
                UNILAG TAEKWONDO CLUB
              </div>
              <div className="text-xs text-zinc-600">University of Lagos, Akoka</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold tracking-wide text-brand-red">
              OFFICIAL RECEIPT
            </div>
            <div className="mt-1 font-mono text-base font-bold text-black">
              {row.receiptNo}
            </div>
          </div>
        </header>

        <div className="mt-6">
          <Row label="Received from" value={row.memberName ?? row.memberEmail} />
          {row.matricOrStaffNo && (
            <Row label="Matric / Staff No." value={row.matricOrStaffNo} />
          )}
          <Row label="In respect of" value={row.periodLabel} />
          <Row
            label="Amount"
            value={`₦${Number(row.amount).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}`}
          />
          <Row
            label="Date received"
            value={row.paidAt ? new Date(row.paidAt).toLocaleDateString("en-GB") : "-"}
          />
          {row.paymentReference && (
            <Row label="Payment reference" value={row.paymentReference} />
          )}
        </div>

        <div className="mt-8 flex items-end justify-between gap-8">
          <div className="text-[11px] leading-relaxed text-zinc-600">
            This receipt confirms the club has received the amount shown above.
            <br />
            Retain it as proof of payment.
          </div>
          <div className="w-56 flex-none text-center">
            <div className="border-b border-black" />
            <div className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">
              Treasurer
            </div>
          </div>
        </div>

        <footer className="mt-8 flex items-center justify-between border-t border-zinc-300 pt-2 text-[9px] text-zinc-500">
          <span>University of Lagos Taekwondo Club</span>
          <span>Form UTC-R (2026)</span>
        </footer>
      </div>
    </div>
  );
}
