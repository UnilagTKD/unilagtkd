import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { auth } from "@/auth";
import { db } from "@/db";
import { dues, users, memberProfiles } from "@/db/schema";
import { requireExcoPermission } from "@/lib/session";
import { EXCO_POSITION_SHORT_LABELS } from "@/lib/exco";
import { amountInWords } from "@/lib/number-to-words";
import { PrintButton } from "./print-button";

const signatoryProfile = alias(memberProfiles, "signatory_profile");
const signatoryUser = alias(users, "signatory_user");

/* Official receipt UTC-R, laid out to match the printed pad the club already
   uses (Unilag Taekwondo Payment Receipt) - same sections, same order, filled
   in from the dues row the Treasurer issued against. */

const NAVY = "#1e3a5f";

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center bg-brand-red py-1.5 pl-3 pr-6 text-[11px] font-bold uppercase tracking-wide text-white"
      style={{ clipPath: "polygon(0 0, 92% 0, 100% 50%, 92% 100%, 0 100%)" }}
    >
      {children}
    </div>
  );
}

function FieldBox({ value, className = "" }: { value: string; className?: string }) {
  return (
    <div
      className={`min-w-0 flex-1 truncate rounded border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-black ${className}`}
    >
      {value || " "}
    </div>
  );
}

function AmountBoxes({ amount }: { amount: number }) {
  const naira = Math.floor(amount);
  const kobo = Math.round((amount - naira) * 100);
  const digits = String(naira).split("");
  const koboDigits = String(kobo).padStart(2, "0").split("");

  const cell = "flex h-8 w-7 flex-none items-center justify-center border border-zinc-400 text-sm font-bold";

  return (
    <div className="flex flex-wrap">
      <div className={`${cell} border-brand-red text-brand-red`}>&#8358;</div>
      {digits.map((d, i) => (
        <div key={i} className={`${cell} text-black`}>
          {d}
        </div>
      ))}
      <div className={`${cell} text-black`}>.</div>
      {koboDigits.map((d, i) => (
        <div key={i} className={`${cell} font-bold text-brand-red`}>
          {d}
        </div>
      ))}
    </div>
  );
}

function Checkbox({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-4 w-4 flex-none items-center justify-center border-2 text-[10px] font-bold ${
          checked ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" : "border-zinc-400 text-transparent"
        }`}
      >
        &#10003;
      </div>
      <span className="text-sm font-semibold text-[#1e3a5f]">{label}</span>
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
      signatoryName: signatoryProfile.fullName,
      signatureUrl: signatoryProfile.signatureUrl,
      signatoryPosition: signatoryUser.excoPosition,
    })
    .from(dues)
    .innerJoin(users, eq(users.id, dues.userId))
    .leftJoin(memberProfiles, eq(memberProfiles.userId, dues.userId))
    .leftJoin(signatoryProfile, eq(signatoryProfile.userId, dues.recordedBy))
    .leftJoin(signatoryUser, eq(signatoryUser.id, dues.recordedBy))
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

  const amount = Number(row.amount);
  const paidAt = row.paidAt ? new Date(row.paidAt) : null;
  const day = paidAt ? String(paidAt.getDate()).padStart(2, "0") : "__";
  const month = paidAt ? String(paidAt.getMonth() + 1).padStart(2, "0") : "__";
  const year2 = paidAt ? String(paidAt.getFullYear()).slice(-2) : "__";

  const purposeLines = [
    row.periodLabel,
    row.matricOrStaffNo ? `Matric / Staff No: ${row.matricOrStaffNo}` : "",
    row.paymentReference ? `Payment Reference: ${row.paymentReference}` : "",
  ];

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

      {/* Outer navy rule + inner red rule, matching the printed UTC-R pad. */}
      <div
        className="relative mt-6 border-2 p-1.5 print:mt-0"
        style={{ borderColor: NAVY }}
      >
        <div className="border-2 border-brand-red bg-white p-6 text-black print:p-5">
          <header className="flex flex-wrap items-center justify-between gap-4 pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/unilag-logo.png" alt="" className="h-16 w-16 flex-none object-contain" />
            <div className="flex-1 text-center">
              <div className="text-xl font-black uppercase tracking-tight sm:text-2xl" style={{ color: NAVY }}>
                Unilag Taekwondo Club
              </div>
              <div className="text-lg font-black uppercase tracking-tight text-brand-red sm:text-xl">
                Official Payment Receipt
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/club-logo.png" alt="" className="h-16 w-16 flex-none object-contain" />
          </header>

          <div className="flex items-center gap-3 border-t-2 pt-1" style={{ borderColor: NAVY }}>
            <div className="h-px flex-1" style={{ backgroundColor: NAVY }} />
            <span className="text-brand-red">&#9670;</span>
            <div className="h-px flex-1" style={{ backgroundColor: NAVY }} />
          </div>

          <div
            className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b-2 pb-3 text-sm"
            style={{ borderColor: NAVY }}
          >
            <div>
              <span className="font-bold text-brand-red">RECEIPT NO: </span>
              <span className="font-mono font-bold">{row.receiptNo}</span>
            </div>
            <div className="font-bold" style={{ color: NAVY }}>
              DATE: {day} / {month} / 20{year2}
            </div>
          </div>

          {/* 1. Payee details */}
          <div className="mt-4">
            <SectionTag>1. Payee Details</SectionTag>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex-none text-sm font-bold" style={{ color: NAVY }}>
                Full Name of Payee:
              </span>
              <FieldBox value={row.memberName ?? row.memberEmail} />
            </div>
          </div>

          <div className="my-4 h-0.5" style={{ backgroundColor: NAVY }} />

          {/* 2. Transaction summary */}
          <div>
            <SectionTag>2. Transaction Summary</SectionTag>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="flex-none text-sm font-bold" style={{ color: NAVY }}>
                The sum of (in words):
              </span>
              <FieldBox value={amountInWords(amount)} />
              <span className="flex-none text-sm font-bold" style={{ color: NAVY }}>
                Naira.
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <span className="flex-none text-sm font-bold" style={{ color: NAVY }}>
                Amount Paid (&#8358;):
              </span>
              <AmountBoxes amount={amount} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-6">
              <span className="flex-none text-sm font-bold" style={{ color: NAVY }}>
                Payment Method:
              </span>
              <Checkbox label="Cash" checked={false} />
              <Checkbox label="Bank Transfer" checked />
              <Checkbox label="Bank Deposit" checked={false} />
            </div>
          </div>

          <div className="my-4 h-0.5" style={{ backgroundColor: NAVY }} />

          {/* 3. Purpose of payment */}
          <div>
            <SectionTag>
              3. Purpose of Payment <span className="ml-1 font-normal italic">(To be completed by the Treasurer)</span>
            </SectionTag>
            <div className="mt-3 space-y-2">
              {purposeLines.map((line, i) => (
                <FieldBox key={i} value={line} />
              ))}
            </div>
          </div>

          <div className="my-4 h-0.5" style={{ backgroundColor: NAVY }} />

          {/* 4. Authorization & signature */}
          <div>
            <SectionTag>4. Authorization &amp; Signature</SectionTag>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-8">
              <p className="max-w-sm flex-1 text-[12px] italic leading-relaxed text-zinc-700">
                &ldquo;The Treasury and Funds Management branch confirms the secure receipt
                of the stated funds into the club&apos;s designated accounts under Section
                7.9 of the manual.&rdquo;
              </p>
              <div className="w-full flex-none text-center sm:w-56">
                {row.signatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.signatureUrl}
                    alt={`${row.signatoryName ?? "Treasurer"}'s signature`}
                    className="mx-auto h-14 object-contain"
                  />
                ) : (
                  <div className="h-14" />
                )}
                <div className="border-b border-black" />
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>
                  {row.signatoryName
                    ? `${row.signatoryName}, ${
                        row.signatoryPosition
                          ? EXCO_POSITION_SHORT_LABELS[row.signatoryPosition]
                          : "Treasurer"
                      }`
                    : "Treasurer Signature"}
                </div>
              </div>
            </div>
          </div>

          <footer
            className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t pt-3 text-center text-[11px] font-bold uppercase tracking-wide text-brand-red"
            style={{ borderColor: "#d4d4d8" }}
          >
            {["Courtesy", "Integrity", "Perseverance", "Self-Control", "Indomitable Spirit"].map(
              (tenet, i, arr) => (
                <span key={tenet} className="flex items-center gap-2">
                  {tenet}
                  {i < arr.length - 1 && <span style={{ color: NAVY }}>&#9733;</span>}
                </span>
              )
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
