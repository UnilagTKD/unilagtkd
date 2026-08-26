import type { Metadata } from "next";
import { ResourcesContent } from "@/components/resources-content";
import { TerminologyContent } from "@/components/terminology-content";

export const metadata: Metadata = { title: "Resources" };

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <span className="text-sm font-semibold uppercase tracking-widest text-brand-red">
        Reference
      </span>
      <h1 className="mt-2 text-3xl font-bold text-brand-black sm:text-4xl">Resources</h1>
      <p className="mt-4 max-w-2xl text-zinc-600">
        History, philosophy, dojang etiquette, safety protocols, and conduct
        expectations every member should know.
      </p>

      <ResourcesContent />

      <div className="mt-12">
        <h2 className="text-xl font-bold text-brand-black">Taekwondo Terminology</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Common Korean terms used in the dojang.
        </p>
        <TerminologyContent />
      </div>
    </div>
  );
}
