import {
  DOJANG_ETIQUETTE,
  UNIFORM_RULES,
  ATTENDANCE_THRESHOLDS,
  HERITAGE,
  PHILOSOPHY,
  NIGERIA_TKD_HISTORY,
} from "@/lib/constants";
import { Reveal } from "@/components/reveal";

export function ResourcesContent() {
  return (
    <>
      <div className="mt-12">
        <h2 className="text-xl font-bold text-brand-black">History &amp; Philosophy</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-xl border border-black/10 p-6">
              <h3 className="font-semibold text-brand-blue">Taekwondo in Nigeria</h3>
              <p className="mt-3 text-sm text-zinc-600">{NIGERIA_TKD_HISTORY.intro}</p>
              <p className="mt-3 text-sm text-zinc-600">{NIGERIA_TKD_HISTORY.federation}</p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="h-full rounded-xl border border-black/10 p-6">
              <h3 className="font-semibold text-brand-red">Our Club&apos;s Lineage</h3>
              <p className="mt-3 text-sm text-zinc-600">{HERITAGE.pioneer}</p>
              <p className="mt-3 text-sm text-zinc-600">{HERITAGE.jidokwan}</p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={160}>
          <div className="mt-4 rounded-xl bg-zinc-50 p-6">
            <h3 className="font-semibold text-brand-black">
              What Does &ldquo;Taekwondo&rdquo; Mean?
            </h3>
            <p className="mt-2 text-sm text-zinc-600">{PHILOSOPHY.translation}</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {PHILOSOPHY.meaning.map((m) => (
                <div key={m.word} className="rounded-lg bg-white p-3 text-center">
                  <div className="font-bold text-brand-black">{m.word}</div>
                  <div className="mt-1 text-xs text-zinc-500">{m.meaning}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {PHILOSOPHY.concepts.map((c) => (
                <div key={c.name} className="rounded-lg bg-white p-3">
                  <div className="font-semibold text-brand-black">
                    {c.name} <span className="font-normal text-zinc-400">({c.subtitle})</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-xl border border-black/10 p-6">
            <h2 className="font-bold text-brand-black">Dojang Etiquette</h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-600">
              {DOJANG_ETIQUETTE.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-brand-red">&bull;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="h-full rounded-xl border border-black/10 p-6">
            <h2 className="font-bold text-brand-black">Uniform (Dobok) Standards</h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-600">
              {UNIFORM_RULES.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-brand-blue">&bull;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-bold text-brand-black">Attendance Thresholds</h2>
        <div className="mt-4 grid grid-cols-3 gap-4 sm:max-w-md">
          <div className="rounded-xl border border-black/10 p-4 text-center">
            <div className="text-2xl font-bold text-brand-black">
              {ATTENDANCE_THRESHOLDS.activeMembership}%
            </div>
            <div className="mt-1 text-xs text-zinc-500">Active Membership</div>
          </div>
          <div className="rounded-xl border border-black/10 p-4 text-center">
            <div className="text-2xl font-bold text-brand-black">
              {ATTENDANCE_THRESHOLDS.promotionalGrading}%
            </div>
            <div className="mt-1 text-xs text-zinc-500">Promotional Grading</div>
          </div>
          <div className="rounded-xl border border-black/10 p-4 text-center">
            <div className="text-2xl font-bold text-brand-black">
              {ATTENDANCE_THRESHOLDS.varsityRosterPool}%
            </div>
            <div className="mt-1 text-xs text-zinc-500">Varsity Roster</div>
          </div>
        </div>
      </div>
    </>
  );
}
