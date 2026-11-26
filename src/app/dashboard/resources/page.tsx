import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ResourcesContent } from "@/components/resources-content";

export default async function DashboardResourcesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-brand-black">Resources</h1>
      <p className="text-sm text-zinc-500">
        History, philosophy, dojang etiquette, safety protocols, and conduct
        expectations every member should know.
      </p>

      <ResourcesContent />
    </div>
  );
}
