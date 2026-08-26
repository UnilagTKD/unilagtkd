import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { dues } from "@/db/schema";
import { BANK_DETAILS } from "@/lib/constants";
import { ClaimPaymentButton } from "@/components/dashboard/claim-payment-button";
import { MEMBER_ROLES } from "@/lib/roles";
import type { UserRole } from "@/types/next-auth";

export default async function PaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Exco officers pay dues like every other member, so they belong here too.
  const allowed: UserRole[] = [...MEMBER_ROLES];
  if (!allowed.includes(session.user.role)) {
    redirect(`/dashboard/${session.user.role}`);
  }

  const duesRows = await db
    .select()
    .from(dues)
    .where(eq(dues.userId, session.user.id))
    .orderBy(desc(dues.createdAt));

  const outstandingDues = duesRows.filter((d) => !d.paid);
  const totalOutstanding = outstandingDues.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Payments</h1>
        <p className="text-sm text-zinc-500">Your dues history and how to pay</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-black/10 border-t-4 border-t-brand-red bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Outstanding</div>
          <div className="mt-1 text-2xl font-bold text-brand-black">
            &#8358;{totalOutstanding.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-black/10 border-t-4 border-t-brand-blue bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Total Records</div>
          <div className="mt-1 text-2xl font-bold text-brand-black">{duesRows.length}</div>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">Dues History</h2>
        {duesRows.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No dues on record.</p>
        ) : (
          <ul className="mt-4 divide-y divide-black/5 text-sm">
            {duesRows.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div>
                    {d.periodLabel}: &#8358;{d.amount}
                  </div>
                  {d.paid && d.paidAt && (
                    <div className="text-xs text-zinc-400">
                      Paid {new Date(d.paidAt).toLocaleDateString()}
                      {d.receiptNo && ` · Receipt ${d.receiptNo}`}
                    </div>
                  )}
                </div>
                {d.paid ? (
                  <span className="flex flex-none items-center gap-2">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Paid
                    </span>
                    {d.receiptNo && (
                      <Link
                        href={`/dashboard/receipts/${d.id}`}
                        className="text-xs font-medium text-brand-blue hover:underline"
                      >
                        View receipt
                      </Link>
                    )}
                  </span>
                ) : d.paymentClaimed ? (
                  <span className="flex-none rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                    Awaiting Confirmation
                  </span>
                ) : (
                  <div className="flex-none">
                    <ClaimPaymentButton duesId={d.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">How to Pay</h2>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            Bank: <span className="font-medium text-zinc-800">{BANK_DETAILS.bankName}</span>
          </div>
          <div>
            Account Name:{" "}
            <span className="font-medium text-zinc-800">{BANK_DETAILS.accountName}</span>
          </div>
          <div className="sm:col-span-2">
            Account Number:{" "}
            <span className="font-medium text-zinc-800">{BANK_DETAILS.accountNumber}</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-600">{BANK_DETAILS.instructions}</p>
      </div>
    </div>
  );
}
