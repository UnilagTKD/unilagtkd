import { LEAVE_REASON_LABELS, type LeaveReason } from "@/lib/exco";
import { LeaveRequestReview } from "./leave-request-review";

export type LeaveRequestRow = {
  id: string;
  memberName: string;
  reasonCategory: LeaveReason;
  startDate: string;
  endDate: string;
  details: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewNotes: string | null;
};

const STATUS_STYLES: Record<LeaveRequestRow["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-zinc-200 text-zinc-600",
};

function formatRange(startDate: string, endDate: string) {
  const start = new Date(startDate).toLocaleDateString();
  const end = new Date(endDate).toLocaleDateString();
  return start === end ? start : `${start} - ${end}`;
}

export function LeaveRequestsPanel({ requests }: { requests: LeaveRequestRow[] }) {
  const pending = requests.filter((r) => r.status === "pending");
  const settled = requests.filter((r) => r.status !== "pending");

  return (
    <div className="rounded-xl border border-black/10 bg-white p-6">
      <h2 className="font-semibold text-brand-black">
        Leave Requests ({pending.length} awaiting you)
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Members asking to be excused from training. Approving one records it against
        their attendance history.
      </p>

      <ul className="mt-4 space-y-3">
        {pending.map((r) => (
          <li key={r.id} className="rounded-lg border border-yellow-300 bg-yellow-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-brand-black">{r.memberName}</div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-600">
                {LEAVE_REASON_LABELS[r.reasonCategory]}
              </span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {formatRange(r.startDate, r.endDate)}
            </div>
            <p className="mt-2 text-sm text-zinc-700">{r.details}</p>
            <LeaveRequestReview requestId={r.id} />
          </li>
        ))}
        {pending.length === 0 && (
          <li className="text-sm text-zinc-500">No requests awaiting a decision.</li>
        )}
      </ul>

      {settled.length > 0 && (
        <>
          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Decided
          </h3>
          <ul className="mt-2 divide-y divide-black/5 text-sm">
            {settled.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 py-2">
                <div>
                  <span className="font-medium text-brand-black">{r.memberName}</span>
                  <span className="text-zinc-500">
                    {" "}
                    - {LEAVE_REASON_LABELS[r.reasonCategory]},{" "}
                    {formatRange(r.startDate, r.endDate)}
                  </span>
                  {r.reviewNotes && (
                    <p className="mt-0.5 text-xs text-zinc-500">Note: {r.reviewNotes}</p>
                  )}
                </div>
                <span
                  className={`flex-none rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
