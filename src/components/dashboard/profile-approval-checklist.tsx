import { PROFILE_REVIEW_LABELS, PROFILE_REVIEW_STAGES, type ProfileApprovals } from "@/lib/verification-permissions";

export function ProfileApprovalChecklist({ approvals }: { approvals: ProfileApprovals }) {
  return (
    <ul aria-label="Profile approvals" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {PROFILE_REVIEW_STAGES.map(stage => (
        <li key={stage} className={approvals[stage] ? "text-green-700" : "text-zinc-600"}>
          {PROFILE_REVIEW_LABELS[stage]} · {approvals[stage] ? "Approved" : "Pending"}
        </li>
      ))}
    </ul>
  );
}
