import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { leaveRequests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { LEAVE_REASON_LABELS } from "@/lib/exco";
import { LeaveRequestForm } from "./leave-request-form";
import { WithdrawLeaveButton } from "./withdraw-leave-button";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-zinc-200 text-zinc-600",
};

export default async function LeavePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const myRequests = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.userId, session.user.id))
    .orderBy(desc(leaveRequests.createdAt));

  const active = myRequests.filter(
    (r) => r.status === "approved" && new Date(r.endDate) >= new Date()
  );

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Leave Requests</h1>
        <p className="text-sm text-zinc-500">
          Ask to be excused from training. A coach reviews each request. Coaches must have their own leave reviewed by another coach.
        </p>
      </div>

      {active.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          You are currently excused from training until{" "}
          {new Date(active[0].endDate).toLocaleDateString()}.
        </div>
      )}

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <LeaveRequestForm />

        <ul className="mt-6 divide-y divide-black/5">
          {myRequests.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-semibold text-brand-black">
                  {LEAVE_REASON_LABELS[r.reasonCategory]},{" "}
                  {new Date(r.startDate).toLocaleDateString()} -{" "}
                  {new Date(r.endDate).toLocaleDateString()}
                </div>
                <p className="mt-1 text-sm text-zinc-600">{r.details}</p>
                {r.reviewNotes && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Welfare note: {r.reviewNotes}
                  </p>
                )}
              </div>
              <div className="flex flex-none items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}
                >
                  {r.status}
                </span>
                {r.status === "pending" && <WithdrawLeaveButton requestId={r.id} />}
              </div>
            </li>
          ))}
          {myRequests.length === 0 && (
            <li className="py-3 text-sm text-zinc-500">
              You have not requested leave yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
