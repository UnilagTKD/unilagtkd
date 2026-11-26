import { PROFILE_FIELD_LABELS, type ProfileInput } from "@/lib/validation/profile";
import type { profileChangeRequests } from "@/db/schema";
import { ProfileApprovalChecklist } from "./profile-approval-checklist";
export function ProfileChangeStatus({ request }: { request: typeof profileChangeRequests.$inferSelect }) {
  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 sm:p-6">
      <h2 className="font-semibold">Profile change request: {request.status}</h2>
      <p className="text-sm text-zinc-600">{request.status === "pending" ? "Your changes take effect after all four reviewers approve them." : request.status === "approved" ? "These changes were approved and applied to your profile." : "These changes were rejected."}</p>
      {request.status === "pending" && <ProfileApprovalChecklist approvals={request.approvals} />}
      <dl className="space-y-2 text-sm">
        {(Object.keys(request.proposed) as (keyof ProfileInput)[]).map((field) => (
          <div key={field} className="grid gap-1 sm:grid-cols-2"><dt className="text-zinc-500">{PROFILE_FIELD_LABELS[field]}</dt><dd className="break-words">{request.proposed[field] || "Not set"}</dd></div>
        ))}
      </dl>
      {request.reviewNote && <p className="text-sm">Reviewer note: {request.reviewNote}</p>}
    </section>
  );
}
