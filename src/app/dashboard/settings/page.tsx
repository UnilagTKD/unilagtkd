import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { getPortalAccount, getSession } from "@/lib/session";
import { db } from "@/db";
import { memberProfiles, profileChangeRequests } from "@/db/schema";
import { ProfileChangeStatus } from "@/components/dashboard/profile-change-status";
import { ReceiptSignatureSettings } from "./receipt-signature-settings";
import { canManageReceiptSignature } from "@/lib/exco";
import { memberPhoto, memberPhotoReference } from "@/lib/member-photo";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const [[profile], account, [latestRequest]] = await Promise.all([
    db
      .select({
        fullName: memberProfiles.fullName,
        department: memberProfiles.department,
        faculty: memberProfiles.faculty,
        levelYear: memberProfiles.levelYear,
        phone: memberProfiles.phone,
        address: memberProfiles.address,
        avatarUrl: memberPhotoReference(memberProfiles.avatarUrl, "profile"),
        signatureUrl: memberProfiles.signatureUrl,
        beltGrade: memberProfiles.beltGrade,
        membershipCategory: memberProfiles.membershipCategory,
        matricOrStaffNo: memberProfiles.matricOrStaffNo,
        graduationYear: memberProfiles.graduationYear,
        institution: memberProfiles.institution,
        occupation: memberProfiles.occupation,
      })
      .from(memberProfiles)
      .where(eq(memberProfiles.userId, session.user.id))
      .limit(1),
    getPortalAccount(session.user.id),
    db.select().from(profileChangeRequests)
      .where(eq(profileChangeRequests.userId, session.user.id)).orderBy(desc(profileChangeRequests.createdAt)).limit(1),
  ]);
  const photo = await memberPhoto(session.user.id, profile?.avatarUrl);

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Settings</h1>
        <p className="text-sm text-zinc-500">Update your profile and password</p>
      </div>

      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Your profile picture" className="h-24 w-24 rounded-xl object-cover" />
      )}
      {canManageReceiptSignature(session.user.role, account?.position ?? null) && <ReceiptSignatureSettings initialSignatureUrl={profile?.signatureUrl ?? ""} />}
      {latestRequest && <ProfileChangeStatus request={latestRequest} />}
      <SettingsForm
        isCoach={session.user.role === "coach"}
        hasPendingRequest={latestRequest?.status === "pending"}
        email={session.user.email ?? ""}
        fullName={profile?.fullName ?? ""}
        initialDepartment={profile?.department ?? ""}
        initialFaculty={profile?.faculty ?? ""}
        initialLevelYear={profile?.levelYear ?? ""}
        initialUsername={account?.username ?? ""}
        initialPhone={profile?.phone ?? ""}
        initialAddress={profile?.address ?? ""}
        initialBeltGrade={profile?.beltGrade ?? ""}
        initialMembershipCategory={profile?.membershipCategory ?? "non_student"}
        initialMatricOrStaffNo={profile?.matricOrStaffNo ?? ""}
        initialGraduationYear={profile?.graduationYear ?? ""}
        initialInstitution={profile?.institution ?? ""}
        initialOccupation={profile?.occupation ?? ""}
      />
    </div>
  );
}
