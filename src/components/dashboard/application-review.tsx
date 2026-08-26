"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewApplication } from "@/app/dashboard/actions";
import type { applications } from "@/db/schema";

type Application = typeof applications.$inferSelect;

export function ApplicationReview({ application }: { application: Application }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<"approved" | "rejected" | null>(null);
  const [setupLink, setSetupLink] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function decide(decision: "approved" | "rejected") {
    setSubmitting(decision);
    const result = await reviewApplication(application.id, decision, notes);
    setSubmitting(null);
    if (result.setupLink) setSetupLink(result.setupLink);
    router.refresh();
  }

  if (setupLink) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
        <p className="font-medium text-green-800">
          {application.fullName} approved. Share this setup link with them to activate their
          account:
        </p>
        <code className="mt-2 block break-all rounded bg-white p-2 text-xs text-zinc-700">
          {typeof window !== "undefined" ? window.location.origin : ""}
          {setupLink}
        </code>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-black/10 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {application.photoData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={application.photoData}
              alt={application.fullName}
              className="h-12 w-12 flex-none rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-zinc-100 text-[10px] text-zinc-400">
              No photo
            </div>
          )}
          <div>
            <div className="font-semibold text-brand-black">{application.fullName}</div>
            <div className="text-xs text-zinc-500">
              {application.membershipCategory} · {application.department} · {application.email}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs font-medium text-brand-red hover:underline"
        >
          {expanded ? "Hide details" : "View details"}
        </button>
      </div>

      {expanded && (
        <dl className="mt-3 grid gap-2 rounded-md bg-zinc-50 p-3 text-xs sm:grid-cols-2">
          <div><dt className="text-zinc-400">Matric/Staff No.</dt><dd>{application.matricOrStaffNo || "-"}</dd></div>
          <div><dt className="text-zinc-400">Phone</dt><dd>{application.phone}</dd></div>
          <div><dt className="text-zinc-400">Faculty / Level</dt><dd>{application.faculty} / {application.levelYear || "-"}</dd></div>
          <div><dt className="text-zinc-400">Prior Training</dt><dd>{application.priorTraining ? `Yes (${application.beltGrade || "unspecified"})` : "No"}</dd></div>
          <div><dt className="text-zinc-400">Emergency Contact</dt><dd>{application.emergencyContactName} ({application.emergencyContactRelationship}), {application.emergencyContactPhone}</dd></div>
          <div><dt className="text-zinc-400">Blood Group / Genotype</dt><dd>{application.bloodGroup || "-"} / {application.genotype || "-"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-zinc-400">Statement of Purpose</dt><dd>{application.statementOfPurpose}</dd></div>
        </dl>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional review notes"
        rows={2}
        className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs"
      />

      <div className="mt-3 flex gap-3">
        <button
          type="button"
          disabled={submitting !== null}
          onClick={() => decide("approved")}
          className="rounded-full bg-brand-red px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {submitting === "approved" ? "Approving..." : "Approve"}
        </button>
        <button
          type="button"
          disabled={submitting !== null}
          onClick={() => decide("rejected")}
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-60"
        >
          {submitting === "rejected" ? "Rejecting..." : "Reject"}
        </button>
      </div>
    </div>
  );
}
