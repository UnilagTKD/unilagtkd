import { canReviewProfileChange } from "@/lib/verification-permissions";
﻿import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { memberProfiles, profileChangeRequests, users } from "@/db/schema";
import { PROFILE_FIELD_LABELS, type ProfileInput } from "@/lib/validation/profile";
import { ProfileChangeReviewButtons } from "./profile-change-review-buttons";
export async function ProfileChangeReviewPanel() {
  const session = await auth();
  if (!session?.user) return null;
  const [reviewer] = await db.select().from(users).where(and(eq(users.id, session.user.id), eq(users.status, "active"))).limit(1);
  if (!reviewer || !(reviewer.role === "admin" || reviewer.role === "coach")) return null;
  const pending = await db.select({ request: profileChangeRequests, name: memberProfiles.fullName, email: users.email })
    .from(profileChangeRequests).innerJoin(users, eq(users.id, profileChangeRequests.userId))
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id)).where(eq(profileChangeRequests.status, "pending"))
    .orderBy(desc(profileChangeRequests.createdAt));
  const requests = pending.filter(({ request }) => canReviewProfileChange(reviewer.role, request.proposed));
  return <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
    <h2 className="font-semibold text-brand-black">{reviewer.role === "coach" ? "Belt change requests" : "Profile change requests"} ({requests.length})</h2>
    {requests.length === 0 && <p className="mt-2 text-sm text-zinc-500">No profile changes awaiting review.</p>}
    <ul className="mt-4 space-y-4">{requests.map(({request, name, email}) => <li key={request.id} className="rounded-lg border border-zinc-200 p-3 sm:p-4">
      <h3 className="font-medium">{name ?? email}</h3>
      {request.memberNote && <p className="mt-2 text-sm text-zinc-600">Member confirmation / reason: {request.memberNote}</p>}
      <dl className="mt-2 space-y-2 text-sm">{(Object.keys(request.proposed) as (keyof ProfileInput)[]).map((field) => <div key={field} className="grid gap-1 sm:grid-cols-3">
        <dt className="text-zinc-500">{PROFILE_FIELD_LABELS[field]}</dt><dd className="break-words text-zinc-500">Current: {request.before[field] || "Not set"}</dd><dd className="break-words">Requested: {request.proposed[field] || "Not set"}</dd>
      </div>)}</dl>
      <ProfileChangeReviewButtons id={request.id} isSelf={request.userId === reviewer.id} />
    </li>)}</ul>
  </section>;
}
