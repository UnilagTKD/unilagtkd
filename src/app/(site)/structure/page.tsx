import type { Metadata } from "next";
import { db } from "@/db";
import { leadership, subCommittees } from "@/db/schema";
import { asc } from "drizzle-orm";
import { CHAIN_OF_COMMAND } from "@/lib/constants";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = { title: "Club Structure" };

function LeaderCard({
  name,
  title,
  bio,
  photoUrl,
  delay = 0,
}: {
  name: string;
  title: string;
  bio?: string | null;
  photoUrl?: string | null;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <div className="h-full rounded-xl border border-black/10 p-5 text-center transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={name}
            className="mx-auto h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-500">
            {name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
        )}
        <div className="mt-3 font-semibold text-brand-black">{name}</div>
        <div className="text-sm text-brand-red">{title}</div>
        {bio && <p className="mt-2 text-xs text-zinc-500">{bio}</p>}
      </div>
    </Reveal>
  );
}

export default async function StructurePage() {
  const [allLeadership, allSubCommittees] = await Promise.all([
    db.select().from(leadership).orderBy(asc(leadership.displayOrder)),
    db.select().from(subCommittees).orderBy(asc(subCommittees.name)),
  ]);

  const headCoach = allLeadership.filter((l) => l.category === "head_coach");
  const assistantCoaches = allLeadership.filter((l) => l.category === "assistant_coach");
  const exco = allLeadership.filter((l) => l.category === "exco");

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <span className="text-sm font-semibold uppercase tracking-widest text-brand-red">
        Club Structure
      </span>
      <h1 className="mt-2 text-3xl font-bold text-brand-black sm:text-4xl">
        Leadership &amp; Sub-Committees
      </h1>
      <p className="mt-4 max-w-2xl text-zinc-600">
        The club is led by the coaching staff and an Executive Committee
        (Exco), supported by three sub-committees that every active member
        serves on.
      </p>

      {headCoach.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-bold text-brand-black">Head Coach</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {headCoach.map((l, i) => (
              <LeaderCard key={l.id} name={l.name} title={l.title} bio={l.bio} photoUrl={l.photoUrl} delay={i * 80} />
            ))}
          </div>
        </div>
      )}

      {assistantCoaches.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-bold text-brand-black">Assistant Coaches</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {assistantCoaches.map((l, i) => (
              <LeaderCard key={l.id} name={l.name} title={l.title} bio={l.bio} photoUrl={l.photoUrl} delay={i * 80} />
            ))}
          </div>
        </div>
      )}

      {exco.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-bold text-brand-black">Executive Committee</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {exco.map((l, i) => (
              <LeaderCard key={l.id} name={l.name} title={l.title} bio={l.bio} photoUrl={l.photoUrl} delay={i * 80} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-12">
        <h2 className="text-lg font-bold text-brand-black">Sub-Committees</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Every active member is assigned to one of the following
          sub-structures, each led by a member of the Executive Committee.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {allSubCommittees.map((sc, i) => {
            const leads = allLeadership.filter((l) => l.subCommitteeId === sc.id);
            return (
              <Reveal key={sc.id} delay={i * 90}>
                <div className="h-full rounded-xl border border-black/10 p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
                  <div className="font-semibold text-brand-black">{sc.name}</div>
                  {sc.description && (
                    <p className="mt-1 text-sm text-zinc-600">{sc.description}</p>
                  )}
                  {leads.length > 0 && (
                    <div className="mt-3 text-xs font-medium uppercase tracking-wide text-brand-red">
                      Led by: {leads.map((l) => l.name).join(", ")}
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-lg font-bold text-brand-black">Chain of Command</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Respecting this structure maintains discipline and order during
          training sessions, camps, and travel.
        </p>
        <ol className="mt-4 space-y-2">
          {CHAIN_OF_COMMAND.map((role, i) => (
            <li key={role} style={{ marginLeft: `${i * 12}px` }}>
              <Reveal
                delay={i * 100}
                className="flex items-center gap-3 rounded-lg bg-zinc-50 px-4 py-3 text-sm font-medium text-brand-black"
              >
                <span className="text-xs text-zinc-400">{i + 1}.</span>
                {role}
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
