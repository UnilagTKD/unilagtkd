import { auth } from "@/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import type { UserRole } from "@/types/next-auth";

// Where each role lands when returning to the dashboard from the public site.
const DASHBOARD_HOME: Record<UserRole, string> = {
  student: "/dashboard/student",
  alumni: "/dashboard/alumni",
  coach: "/dashboard/coach",
  exco: "/dashboard/exco",
  admin: "/dashboard/admin",
};

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  const dashboardHref = role ? DASHBOARD_HOME[role] : null;

  return (
    <>
      <SiteHeader dashboardHref={dashboardHref} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
