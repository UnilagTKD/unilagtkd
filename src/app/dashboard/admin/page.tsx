import { ExcoAppointments } from "@/components/dashboard/exco-appointments";
import Link from "next/link";
import { Suspense } from "react";
import { UsersRolesTable } from "@/components/dashboard/users-roles-table";
import { db } from "@/db";
import { applications, memberProfiles, users } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { count, desc, eq } from "drizzle-orm";

export default async function AdminDashboardPage() {
  const admin = await requireRole(["admin"]);
  const [[pendingApplications], userRows] = await Promise.all([
    db
      .select({ total: count() })
      .from(applications)
      .where(eq(applications.status, "pending")),
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
        <p className="mt-2 text-sm text-zinc-500">{pendingApplications.total} membership applications awaiting verification. Review profile changes and account recovery requests from the verification page.</p>
        <Link href="/dashboard/admin/verifications" className="mt-3 inline-block text-sm font-semibold text-brand-red">Open verifications &rarr;</Link>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
        <h2 className="font-semibold text-brand-black">Website content</h2>
        <p className="mt-2 text-sm text-zinc-600">Create, edit, and delete achievements, gallery photos, and blog posts.</p>
        <Link href="/dashboard/admin/cms" className="mt-3 inline-block text-sm font-semibold text-brand-red">Manage content &rarr;</Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["/dashboard/admin/verifications", "Verifications", "Approve applications, profile changes and account recovery."],
          ["/dashboard/treasury/admissions", "Registration dues", "Confirm or decline registration payment receipts."],
          ["/dashboard/admin/examiners", "Examiners", "Create and email private grading invitations."],
          ["/dashboard/admin/cms", "Website content", "Manage achievements, gallery and Insights."],
          ["/dashboard/reports", "Monthly summaries", "Review reports and manage extra recipients."],
          ["/dashboard/messages", "Contact messages", "Read messages sent through the public website."],
        ].map(([href,title,description]) => <Link key={href} href={href} className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm hover:border-blue-400"><h2 className="font-semibold text-brand-blue">{title} ?</h2><p className="mt-2 text-sm text-zinc-600">{description}</p></Link>)}
      </section>
      <section className="rounded-xl bg-brand-blue p-6 text-white"><h2 className="font-semibold">Accounts and appointments</h2><p className="mt-2 text-sm">To set a coach account, find an approved member below and change their role to coach. Assign executive offices in Exco appointments. Existing members retain their profile when their role changes.</p><a href="#accounts" className="mt-3 inline-block rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-blue">Manage accounts</a><p className="mt-4 text-xs text-blue-100">Coaches manage training, attendance, leave and grading results. General payment claims and signed receipts remain with the treasurer. Admin can verify registration dues and approve accounts.</p></section>
      <Suspense fallback={<p role="status" className="text-sm text-zinc-500">Loading Exco appointments…</p>}>
        <ExcoAppointments />
      </Suspense>

      <section id="accounts" className="scroll-mt-6"><UsersRolesTable rows={userRows} currentUserId={admin.id} /></section>
    </div>
  );
}
