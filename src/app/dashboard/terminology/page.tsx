import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { TerminologyContent } from "@/components/terminology-content";

export default async function DashboardTerminologyPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-brand-black">Terminology</h1>
      <p className="text-sm text-zinc-500">Common Korean terms used in the dojang.</p>

      <TerminologyContent />
    </div>
  );
}
