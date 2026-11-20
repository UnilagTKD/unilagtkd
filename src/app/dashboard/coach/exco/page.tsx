import { requireRole } from "@/lib/session";
import { ExcoAppointments } from "@/components/dashboard/exco-appointments";
export default async function CoachExcoAppointmentsPage() {
  await requireRole(["coach"]);
  return <div className="max-w-4xl space-y-6"><header><h1 className="text-2xl font-bold">Exco appointments</h1><p className="mt-1 text-sm text-zinc-500">Appoint registered members to executive offices.</p></header><ExcoAppointments /></div>;
}
