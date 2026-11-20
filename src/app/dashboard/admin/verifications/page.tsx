import { desc, eq, isNotNull } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { applications, users, memberProfiles } from "@/db/schema";
import { ApplicationReview } from "@/components/dashboard/application-review";
import { PasswordResetReview } from "@/components/dashboard/password-reset-review";
import { ProfileChangeReviewPanel } from "@/components/dashboard/profile-change-review-panel";
import { applicationReviewColumns } from "@/lib/application-review-data";
export default async function AdminVerificationsPage() {
  await requireRole(["admin"]);
  const [pending, resets] = await Promise.all([
    db.select(applicationReviewColumns).from(applications).where(eq(applications.status,"pending")).orderBy(desc(applications.createdAt)),
    db.select({ id: users.id, email: users.email, fullName: memberProfiles.fullName, resetRequestedAt: users.resetRequestedAt })
      .from(users).leftJoin(memberProfiles,eq(memberProfiles.userId,users.id)).where(isNotNull(users.resetRequestedAt)).orderBy(desc(users.resetRequestedAt)),
  ]);
  return <div className="max-w-5xl space-y-6">
    <header><h1 className="text-2xl font-bold">Admin verifications</h1><p className="mt-1 text-sm text-zinc-500">Verify membership applications, profile changes, and account recovery. Coaches can also approve belt-only changes. Admins and the treasurer can verify registration payments from Registration dues. Leave approval stays with coaches.</p></header>
    <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4 sm:p-6"><h2 className="font-semibold">Membership applications ({pending.length})</h2>{pending.map(application=><ApplicationReview key={application.id} application={application}/>)}{pending.length===0&&<p className="text-sm text-zinc-500">No applications awaiting verification.</p>}</section>
    <ProfileChangeReviewPanel />
    <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4 sm:p-6"><h2 className="font-semibold">Account recovery ({resets.length})</h2>{resets.map(request=><PasswordResetReview key={request.id} request={request}/>)}{resets.length===0&&<p className="text-sm text-zinc-500">No account recovery requests.</p>}</section>
  </div>;
}
