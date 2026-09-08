import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { memberProfiles, users } from "@/db/schema";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [profile] = await db
    .select({
      fullName: memberProfiles.fullName,
      phone: memberProfiles.phone,
      address: memberProfiles.address,
      avatarUrl: memberProfiles.avatarUrl,
      signatureUrl: memberProfiles.signatureUrl,
      beltGrade: memberProfiles.beltGrade,
    })
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, session.user.id))
    .limit(1);

  const [userRow] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Settings</h1>
        <p className="text-sm text-zinc-500">Update your profile and password</p>
      </div>

      <SettingsForm
        email={session.user.email ?? ""}
        fullName={profile?.fullName ?? ""}
        initialUsername={userRow?.username ?? ""}
        initialPhone={profile?.phone ?? ""}
        initialAddress={profile?.address ?? ""}
        initialAvatarUrl={profile?.avatarUrl ?? ""}
        initialSignatureUrl={profile?.signatureUrl ?? ""}
        initialBeltGrade={profile?.beltGrade ?? ""}
      />
    </div>
  );
}
