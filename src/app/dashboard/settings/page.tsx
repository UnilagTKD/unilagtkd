import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { memberProfiles, users, profileChangeRequests } from "@/db/schema";
import { ProfileChangeStatus } from "@/components/dashboard/profile-change-status";
import { ReceiptSignatureSettings } from "./receipt-signature-settings";
import { canManageReceiptSignature } from "@/lib/exco";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [profile] = await db
    .select({
      fullName: memberProfiles.fullName,
      department: memberProfiles.department,
      faculty: memberProfiles.faculty,
      levelYear: memberProfiles.levelYear,
      phone: memberProfiles.phone,
      address: memberProfiles.address,
      avatarUrl: memberProfiles.avatarUrl,
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
    .limit(1);

  const [userRow] = await db
    .select({ username: users.username, role: users.role, excoPosition: users.excoPosition })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const [latestRequest] = await db.select().from(profileChangeRequests)
    .where(eq(profileChangeRequests.userId, session.user.id)).orderBy(desc(profileChangeRequests.createdAt)).limit(1);

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Settings</h1>
        <p className="text-sm text-zinc-500">Update your profile and password</p>
      </div>

      {userRow && canManageReceiptSignature(userRow.role, userRow.excoPosition) && <ReceiptSignatureSettings initialSignatureUrl={profile?.signatureUrl ?? ""} />}
      {latestRequest && <ProfileChangeStatus request={latestRequest} />}
      <SettingsForm
        isCoach={session.user.role === "coach"}
        hasPendingRequest={latestRequest?.status === "pending"}
        email={session.user.email ?? ""}
        fullName={profile?.fullName ?? ""}
        initialDepartment={profile?.department ?? ""}
        initialFaculty={profile?.faculty ?? ""}
        initialLevelYear={profile?.levelYear ?? ""}
        initialUsername={userRow?.username ?? ""}
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
