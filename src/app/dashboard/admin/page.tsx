import { ExcoAppointments } from "@/components/dashboard/exco-appointments";
import Link from "next/link";
import { UsersRolesTable } from "@/components/dashboard/users-roles-table";
import { db } from "@/db";
import { applications, memberProfiles, users } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { desc, eq } from "drizzle-orm";

export default async function AdminDashboardPage() {
  const admin = await requireRole(["admin"]);
  const [pendingApplications, userRows] = await Promise.all([
    db
      .select()
      .from(applications)
      .where(eq(applications.status, "pending"))
      .orderBy(desc(applications.createdAt)),
    db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        excoPosition: users.excoPosition,
        status: users.status,
        fullName: memberProfiles.fullName,
      })
      .from(users)
      .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
      .orderBy(desc(users.createdAt)),
  ]);

  return (
    <div className="max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-brand-black">Administration</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Review membership applications and appoint registered members as coaches or
          Exco officers. Members first apply through the normal registration process.
        </p>
      </header>

      <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
        <h2 className="font-semibold">Verifications</h2>
        <p className="mt-2 text-sm text-zinc-500">{pendingApplications.length} membership applications awaiting verification. Review profile changes and account recovery requests from the verification page.</p>
        <Link href="/dashboard/admin/verifications" className="mt-3 inline-block text-sm font-semibold text-brand-red">Open verifications &rarr;</Link>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
        <h2 className="font-semibold text-brand-black">Website content</h2>
        <p className="mt-2 text-sm text-zinc-600">Create, edit, and delete achievements, gallery photos, and blog posts.</p>
        <Link href="/dashboard/admin/cms" className="mt-3 inline-block text-sm font-semibold text-brand-red">Manage content &rarr;</Link>
      </section>

      <ExcoAppointments />

      <UsersRolesTable rows={userRows} currentUserId={admin.id} />
    </div>
  );
}
