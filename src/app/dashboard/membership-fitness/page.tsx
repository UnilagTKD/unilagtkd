import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { memberProfiles, membershipFitness, users } from "@/db/schema";
import { canValidateMembershipFitness } from "@/lib/exco";
import { getExcoContext } from "@/lib/session";
import { FitnessForm } from "./fitness-form";

export default async function MembershipFitnessPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { user, position } = await getExcoContext();
  if (!canValidateMembershipFitness(user.role, position)) redirect("/dashboard");

  const { member } = await searchParams;
  const members = await db.select({ id: users.id, name: memberProfiles.fullName, email: users.email })
    .from(memberProfiles).innerJoin(users, eq(users.id, memberProfiles.userId)).orderBy(asc(memberProfiles.fullName));
  const selected = members.find(({ id }) => id === member);
  const [result] = selected ? await db.select().from(membershipFitness)
    .where(eq(membershipFitness.userId, selected.id)).limit(1) : [];

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-brand-black">Membership fitness</h1>
      <form action="/dashboard/membership-fitness" className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm">
          Member
          <select name="member" required defaultValue={selected?.id ?? ""} className="mt-1 block w-full rounded-lg border p-2">
            <option value="" disabled>Select a member</option>
            {members.map(({ id, name, email }) => <option key={id} value={id}>{name} ({email})</option>)}
          </select>
        </label>
        <button type="submit" className="rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white">Open scores</button>
      </form>
      {selected && <FitnessForm key={selected.id} userId={selected.id} name={selected.name} result={result} />}
    </div>
  );
}
