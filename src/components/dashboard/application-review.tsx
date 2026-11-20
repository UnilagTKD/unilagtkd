"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewApplication } from "@/app/dashboard/actions";
import type { ApplicationReviewData as Application } from "@/lib/application-review-data";

export function ApplicationReview({ application }: { application: Application }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<"approved" | "rejected" | null>(null);
  const [setupLink, setSetupLink] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [surname, setSurname] = useState(application.surname ?? application.fullName.trim().split(/\s+/)[0]);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function decide(decision: "approved" | "rejected") {
    setSubmitting(decision);
    setError(null);
    try {
    const result = await reviewApplication(application.id, decision, notes, surname);
    if (result.setupLink) {
      setSetupLink(result.setupLink);
      setEmailSent(Boolean("emailSent" in result && result.emailSent));
    }
    if (decision === "approved") { setApproved(true); setEmailSent(Boolean("emailSent" in result && result.emailSent)); }
    else router.refresh();
    } catch { setError("Could not review this application. Check the surname and try again."); }
    finally { setSubmitting(null); }
  }

  if (approved) return <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900"><p className="font-semibold">{application.fullName} approved.</p><p className="mt-2">They can now log in with their registered email and their surname in lowercase. They can update their password in Settings.</p><p className="mt-2">{emailSent ? "A sign-in notification was emailed to the member." : "Email could not be sent. Share these login instructions with the member directly."}</p><button type="button" onClick={() => router.refresh()} className="mt-3 font-semibold underline">Done</button></div>;

  if (setupLink) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
        <p className="font-medium text-green-800">
          {application.fullName} approved.{" "}
          {emailSent
            ? `An activation email was sent to ${application.email}.`
            : "Email is not configured, so share this setup link with them directly:"}
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
          <div><dt className="text-zinc-400">Graduation year</dt><dd>{application.graduationYear || "-"}</dd></div>
          <div><dt className="text-zinc-400">Institution / Occupation</dt><dd>{application.institution || "-"} / {application.occupation || "-"}</dd></div>
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
      <p className="mt-3 text-sm text-zinc-600">Semester dues: {application.semesterLabel || "Not supplied"} · ₦{Number(application.semesterDues || 0).toLocaleString("en-NG")} · {application.paymentStatus}</p>
      <label className="mt-3 block text-xs font-medium text-zinc-700">Confirm surname for initial login<input value={surname} onChange={event => setSurname(event.target.value)} maxLength={100} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2" /></label>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}

      <div className="mt-3 flex gap-3">
        <button
          type="button"
          disabled={submitting !== null || application.paymentStatus !== "confirmed"}
          onClick={() => decide("approved")}
          className="rounded-full bg-brand-red px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {submitting === "approved" ? "Approving..." : application.paymentStatus === "confirmed" ? "Approve" : "Awaiting payment confirmation"}
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
