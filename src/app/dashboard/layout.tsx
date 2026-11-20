import { siteHref } from "@/lib/domains";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import type { UserRole } from "@/types/next-auth";
import { ClubLogo } from "@/components/club-logo";
import { getExcoPosition } from "@/lib/session";
import { EXCO_POSITION_SHORT_LABELS } from "@/lib/exco";
import { DashboardMobileNav } from "./mobile-nav";
import type { Metadata } from "next";
import { PRIVATE_ROBOTS } from "@/lib/seo";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, eq, isNull, count } from "drizzle-orm";
export const metadata: Metadata = { title: "Member portal", robots: PRIVATE_ROBOTS };

const NAV_BY_ROLE: Record<UserRole, { href: string; label: string }[]> = {
  student: [
    { href: "/dashboard/student", label: "My Dashboard" },
    { href: "/dashboard/payments", label: "Payments" },
    { href: "/dashboard/membership-form", label: "Membership Form" },
    { href: "/dashboard/club-waiver", label: "Club Waiver" },
    { href: "/dashboard/resources", label: "Resources" },
    { href: "/dashboard/terminology", label: "Terminology" },
    { href: "/dashboard/poomsae", label: "Poomsae" },
    { href: "/dashboard/safety", label: "Injury & Safety" },
    { href: "/dashboard/grading", label: "Grading" },
    { href: "/dashboard/leave", label: "Leave" },
    { href: "/dashboard/settings", label: "Settings" },
  ],
  alumni: [
    { href: "/dashboard/alumni", label: "My Dashboard" },
    { href: "/dashboard/payments", label: "Payments" },
    { href: "/dashboard/membership-form", label: "Membership Form" },
    { href: "/dashboard/club-waiver", label: "Club Waiver" },
    { href: "/dashboard/resources", label: "Resources" },
    { href: "/dashboard/terminology", label: "Terminology" },
    { href: "/dashboard/poomsae", label: "Poomsae" },
    { href: "/dashboard/safety", label: "Injury & Safety" },
    { href: "/dashboard/grading", label: "Grading" },
    { href: "/dashboard/leave", label: "Leave" },
    { href: "/dashboard/settings", label: "Settings" },
  ],
  coach: [
    { href: "/dashboard/coach", label: "Coach Dashboard" },
    { href: "/dashboard/coach/members", label: "Members" },
    { href: "/dashboard/messages", label: "Contact messages" },
    { href: "/dashboard/coach/exco", label: "Exco appointments" },
    { href: "/dashboard/coach/admins", label: "Admin appointments" },
    { href: "/dashboard/reports", label: "Monthly summaries" },
    { href: "/dashboard/coach/attendance", label: "Manage attendance" },
    { href: "/dashboard/coach/grading", label: "Manage grading" },
    { href: "/dashboard/payments", label: "Payments" },
    { href: "/dashboard/membership-form", label: "Membership Form" },
    { href: "/dashboard/club-waiver", label: "Club Waiver" },
    { href: "/dashboard/resources", label: "Resources" },
    { href: "/dashboard/terminology", label: "Terminology" },
    { href: "/dashboard/poomsae", label: "Poomsae" },
    { href: "/dashboard/safety", label: "Injury & Safety" },
    { href: "/dashboard/grading", label: "My grading" },
    { href: "/dashboard/leave", label: "My leave" },
    { href: "/dashboard/settings", label: "Settings" },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Administration" },
    { href: "/dashboard/admin/verifications", label: "Verifications" },
    { href: "/dashboard/treasury/admissions", label: "Registration dues" },
    { href: "/dashboard/admin/cms", label: "Content management" },
    { href: "/dashboard/reports", label: "Monthly summaries" },
    { href: "/dashboard/messages", label: "Contact messages" },
    { href: "/dashboard/settings", label: "Settings" },
  ],
  // An exco officer is a member first: their member dashboard is unchanged and
  // their post adds a dashboard of its own, inserted below in the layout.
  exco: [
    { href: "/dashboard/student", label: "My Dashboard" },
    { href: "/dashboard/payments", label: "Payments" },
    { href: "/dashboard/membership-form", label: "Membership Form" },
    { href: "/dashboard/club-waiver", label: "Club Waiver" },
    { href: "/dashboard/resources", label: "Resources" },
    { href: "/dashboard/terminology", label: "Terminology" },
    { href: "/dashboard/poomsae", label: "Poomsae" },
    { href: "/dashboard/safety", label: "Injury & Safety" },
    { href: "/dashboard/grading", label: "Grading" },
    { href: "/dashboard/leave", label: "Leave" },
    { href: "/dashboard/settings", label: "Settings" },
  ],
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const navLinks = [...NAV_BY_ROLE[session.user.role]];
  const [unread] = await db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, session.user.id), isNull(notifications.readAt)));
  navLinks.splice(1, 0, { href: "/dashboard/notifications", label: `Notifications${unread.value ? ` (${unread.value})` : ""}` });
  if (session.user.role !== "admin") navLinks.splice(1, 0, { href: "/dashboard/attendance", label: "My attendance" });

  // An officer's post adds a dashboard of its own, named after the post, right
  // below their member dashboard.
  if (session.user.role === "exco" || session.user.role === "admin") {
    const position = await getExcoPosition(session.user.id);
    if (position === "treasurer") {
      navLinks.splice(1, 0, { href: "/dashboard/treasury/logbook", label: "Treasurer logbook" });
      if (session.user.role !== "admin") navLinks.splice(1, 0, { href: "/dashboard/treasury/admissions", label: "Registration dues" });
    }
    if (position === "president" && session.user.role !== "admin") navLinks.splice(1, 0, { href: "/dashboard/reports", label: "Monthly summaries" });
    if (session.user.role === "exco" || position) navLinks.splice(1, 0, {
      href: "/dashboard/exco",
      label: position ? `${EXCO_POSITION_SHORT_LABELS[position]} Dashboard` : "Exco Dashboard",
    });
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="sticky top-0 hidden h-screen w-64 flex-none flex-col border-r border-white/15 bg-brand-blue lg:flex print:hidden">
        <Link
          href={siteHref("/")}
          className="flex h-16 flex-none items-center gap-2 border-b border-white/15 px-6 hover:bg-white/10"
        >
          <ClubLogo size={32} />
          <span className="text-sm font-semibold text-white">UNILAG TKD</span>
        </Link>
        <nav className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-white hover:bg-white/15"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex-none border-t border-white/15 p-4">
          <div className="mb-3 break-words text-xs text-blue-100">
            Signed in as <span className="font-medium text-white">{session.user.email}</span>
            <br />
            Role: <span className="uppercase text-blue-100">{session.user.role}</span>
          </div>
          <Link
            href={siteHref("/")}
            className="mb-2 block rounded-lg border border-white/30 px-3 py-2 text-center text-sm font-medium text-white hover:bg-white/15"
          >
            &larr; Back to site
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-lg border border-white/30 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <DashboardMobileNav
          navLinks={navLinks}
          email={session.user.email ?? ""}
          role={session.user.role}
          signOutAction={signOutAction}
        />
        <main id="main-content" className="min-w-0 break-words p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
