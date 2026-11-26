import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function DashboardIndexPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  // An exco post is a tag on a member account, not a dashboard of its own -
  // officers land on their member dashboard, which carries their office section.
  if (session.user.role === "exco") {
    redirect("/dashboard/student");
  }

  redirect(`/dashboard/${session.user.role}`);
}
