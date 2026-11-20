import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
export default async function CoachMembershipPage() {
  await requireRole(["coach"]);
  redirect("/dashboard/coach");
}
