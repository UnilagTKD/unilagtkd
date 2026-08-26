import type { Metadata } from "next";
import { db } from "@/db";
import { achievements } from "@/db/schema";
import { desc } from "drizzle-orm";
import { MEDAL_STYLES } from "@/lib/constants";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = { title: "Achievements" };

export default async function AchievementsPage() {
  const results = await db
    .select()
    .from(achievements)
    .orderBy(desc(achievements.competitionDate));

  const medalCounts = results.reduce(
    (acc, r) => {
      acc[r.medal] = (acc[r.medal] ?? 0) + 1;
      return acc;
    },
    { gold: 0, silver: 0, bronze: 0 } as Record<string, number>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <span className="text-sm font-semibold uppercase tracking-widest text-brand-red">
        Track Record
      </span>
      <h1 className="mt-2 text-3xl font-bold text-brand-black sm:text-4xl">Achievements</h1>
      <p className="mt-4 max-w-2xl text-zinc-600">
        Medal and competition results earned by our athletes.
      </p>

      <div className="mt-8 grid grid-cols-3 gap-4 sm:max-w-md">
        {(["gold", "silver", "bronze"] as const).map((medal, i) => (
          <Reveal key={medal} delay={i * 100}>
            <div className="rounded-xl border border-black/10 p-4 text-center">
              <div className="text-2xl font-bold text-brand-black">{medalCounts[medal]}</div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">{medal}</div>
            </div>
          </Reveal>
        ))}
      </div>

      {results.length === 0 ? (
        <p className="mt-12 text-zinc-500">No achievements have been recorded yet.</p>
      ) : (
        <Reveal delay={150}>
          <div className="mt-10 overflow-x-auto rounded-xl border border-black/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Athlete</th>
                  <th className="px-4 py-3">Medal</th>
                  <th className="px-4 py-3">Competition</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Venue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {results.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-brand-black">{r.athleteName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-semibold uppercase ${MEDAL_STYLES[r.medal]}`}
                      >
                        {r.medal}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{r.competitionName}</td>
                    <td className="px-4 py-3 text-zinc-600">{r.competitionDate}</td>
                    <td className="px-4 py-3 text-zinc-600">{r.venue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}
    </div>
  );
}
