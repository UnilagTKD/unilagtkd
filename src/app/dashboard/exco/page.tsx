import { requireRole } from "@/lib/session";
import { ExcoOfficeSection } from "./office-section";

/**
 * Officers reach their office section from their own member dashboard; this
 * route keeps it reachable on its own for the admin "Exco View" and for links
 * that point straight at it.
 */
export default async function ExcoDashboardPage() {
  await requireRole(["exco", "admin"]);

  return (
    <div className="max-w-4xl">
      <ExcoOfficeSection />
    </div>
  );
}
