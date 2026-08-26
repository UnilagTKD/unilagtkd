import { SAFETY_PROTOCOLS } from "@/lib/constants";
import { Reveal } from "@/components/reveal";

export function SafetyProtocols() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {SAFETY_PROTOCOLS.map((p, i) => (
        <Reveal key={p.name} delay={i * 90}>
          <div className="h-full rounded-xl border border-black/10 p-5">
            <div className="text-lg font-bold text-brand-red">{p.name}</div>
            <p className="mt-1 text-xs text-zinc-500">{p.subtitle}</p>
            {"when" in p && p.when ? (
              <p className="mt-2 rounded-md bg-zinc-50 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600">
                When: {p.when}
              </p>
            ) : null}
            <ol className="mt-3 space-y-2.5 text-sm text-zinc-600">
              {p.steps.map((step, si) => (
                <li key={si} className="flex gap-2">
                  <span className="shrink-0 font-semibold text-zinc-400">{si + 1}.</span>
                  <span>
                    <span className="font-semibold text-brand-black">{step.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-600">
                      {step.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            {"note" in p && p.note ? (
              <p className="mt-4 border-t border-black/10 pt-3 text-xs italic leading-relaxed text-zinc-500">
                {p.note}
              </p>
            ) : null}
          </div>
        </Reveal>
      ))}
    </div>
  );
}
