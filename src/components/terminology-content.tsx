import { TKD_GLOSSARY } from "@/lib/constants";
import { Reveal } from "@/components/reveal";

export function TerminologyContent() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {TKD_GLOSSARY.map((group, i) => {
        const isRed = i % 2 === 0;
        return (
          <Reveal key={group.category} delay={i * 80}>
            <div
              className={`h-full rounded-xl border border-black/10 border-t-4 p-5 ${
                isRed ? "border-t-brand-red" : "border-t-brand-blue"
              }`}
            >
              <h3 className="font-semibold text-brand-black">{group.category}</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {group.terms.map((t) => (
                  <div key={t.term} className="flex justify-between gap-3">
                    <dt className={`font-medium ${isRed ? "text-brand-red" : "text-brand-blue"}`}>
                      {t.term}
                    </dt>
                    <dd className="text-right text-zinc-600">{t.meaning}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
