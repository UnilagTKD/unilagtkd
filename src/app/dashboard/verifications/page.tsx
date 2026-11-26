import { redirect } from "next/navigation";
import { ProfileChangeReviewPanel } from "@/components/dashboard/profile-change-review-panel";
import { getExcoContext } from "@/lib/session";
import { profileReviewStages } from "@/lib/verification-permissions";

export default async function VerificationsPage() {
  const { user, position } = await getExcoContext();
  if (!profileReviewStages(user.role, position).length) redirect("/dashboard");
  if (user.role === "admin") redirect("/dashboard/admin/verifications#profile-reviews");

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold text-brand-black">Verifications</h1>
      <ProfileChangeReviewPanel />
    </div>
  );
}
