import { profileReviewStages } from "@/lib/verification-permissions";
import { desc, eq } from "drizzle-orm";
import { getPortalAccount, getSession } from "@/lib/session";
import { db } from "@/db";
import { memberProfiles, profileChangeRequests, users } from "@/db/schema";
import { PROFILE_FIELD_LABELS, type ProfileInput } from "@/lib/validation/profile";
import { ProfileChangeReviewButtons } from "./profile-change-review-buttons";
import { ProfileApprovalChecklist } from "./profile-approval-checklist";
export async function ProfileChangeReviewPanel() {
  const session = await getSession();
  if (!session?.user) return null;
  const reviewer = session.user;
  const account = await getPortalAccount(reviewer.id);
  const stages = profileReviewStages(reviewer.role, account?.position ?? null);
  if (stages.length === 0) return null;
  const requests = await db.select({ request: profileChangeRequests, name: memberProfiles.fullName, email: users.email })
    .from(profileChangeRequests).innerJoin(users, eq(users.id, profileChangeRequests.userId))
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id)).where(eq(profileChangeRequests.status, "pending"))
    .orderBy(desc(profileChangeRequests.createdAt));
  return <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
    <h2 className="font-semibold text-brand-black">Profile change requests ({requests.length})</h2>
    {requests.length === 0 && <p className="mt-2 text-sm text-zinc-500">No profile changes awaiting review.</p>}
    <ul className="mt-4 space-y-4">{requests.map(({request, name, email}) => <li key={request.id} className="rounded-lg border border-zinc-200 p-3 sm:p-4">
      <h3 className="font-medium">{name ?? email}</h3>
      {request.memberNote && <p className="mt-2 text-sm text-zinc-600">Member confirmation / reason: {request.memberNote}</p>}
      <dl className="mt-2 space-y-2 text-sm">{(Object.keys(request.proposed) as (keyof ProfileInput)[]).map((field) => <div key={field} className="grid gap-1 sm:grid-cols-3">
        <dt className="text-zinc-500">{PROFILE_FIELD_LABELS[field]}</dt><dd className="break-words text-zinc-500">Current: {request.before[field] || "Not set"}</dd><dd className="break-words">Requested: {request.proposed[field] || "Not set"}</dd>
      </div>)}</dl>
      <ProfileApprovalChecklist approvals={request.approvals} />
      <ProfileChangeReviewButtons id={request.id} stage={stages.find(stage => !request.approvals[stage])} isSelf={request.userId === reviewer.id} />
    </li>)}</ul>
  </section>;
}
