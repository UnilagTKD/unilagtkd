import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { users, memberProfiles } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { AppointAdminButton } from "@/components/dashboard/appoint-admin-button";

export default async function AdminAppointmentsPage() {
  const session = await requireRole(["coach"]);
  const accounts = await db.select({ id: users.id, email: users.email, role: users.role, name: memberProfiles.fullName })
    .from(users).leftJoin(memberProfiles, eq(users.id, memberProfiles.userId))
    .where(eq(users.status, "active")).orderBy(asc(memberProfiles.fullName), asc(users.email));
  return <div className="max-w-4xl space-y-6">
    <header><h1 className="text-2xl font-bold">Admin appointments</h1><p className="mt-2 text-sm text-zinc-600">Grant administrator access to an active registered account. Their role changes to admin; any executive office is retained. You cannot appoint yourself.</p></header>
    <ul className="divide-y divide-zinc-100 rounded-xl border border-black/10 bg-white px-4 sm:px-6">
      {accounts.filter(account => account.id !== session.id).map(account => <li key={account.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="min-w-0"><p className="font-medium">{account.name || account.email}</p><p className="break-all text-sm text-zinc-500">{account.email}</p><p className="mt-1 text-xs capitalize text-zinc-500">{account.role}</p></div>
        {account.role === "admin" ? <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-brand-blue">Already admin</span> : <AppointAdminButton userId={account.id} name={account.name || account.email} />}
      </li>)}
      {accounts.filter(account => account.id !== session.id).length === 0 && <li className="py-6 text-sm text-zinc-500">No other active accounts available.</li>}
    </ul>
  </div>;
}
