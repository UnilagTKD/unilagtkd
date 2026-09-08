import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import type { UserRole } from "@/types/next-auth";
import { ClubLogo } from "@/components/club-logo";
import { getExcoPosition } from "@/lib/session";
import { EXCO_POSITION_SHORT_LABELS } from "@/lib/exco";
import { DashboardMobileNav } from "./mobile-nav";

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
    { href: "/dashboard/coach/attendance", label: "Attendance" },
    { href: "/dashboard/coach/grading", label: "Grading" },
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

  // An officer's post adds a dashboard of its own, named after the post, right
  // below their member dashboard.
  if (session.user.role === "exco") {
    const position = await getExcoPosition(session.user.id);
    navLinks.splice(1, 0, {
      href: "/dashboard/exco",
      label: position ? `${EXCO_POSITION_SHORT_LABELS[position]} Dashboard` : "Exco Dashboard",
    });
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="sticky top-0 hidden h-screen w-64 flex-none flex-col border-r border-black/10 bg-white sm:flex print:hidden">
        <Link
          href="/"
          className="flex h-16 flex-none items-center gap-2 border-b border-black/10 px-6 hover:bg-zinc-50"
        >
          <ClubLogo size={32} />
          <span className="text-sm font-semibold text-brand-black">UNILAG TKD</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex-none border-t border-black/10 p-4">
          <div className="mb-3 text-xs text-zinc-500">
            Signed in as <span className="font-medium text-zinc-700">{session.user.email}</span>
            <br />
            Role: <span className="uppercase text-brand-red">{session.user.role}</span>
          </div>
          <Link
            href="/"
            className="mb-2 block rounded-lg border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            &larr; Back to site
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
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
        <main className="min-w-0 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
