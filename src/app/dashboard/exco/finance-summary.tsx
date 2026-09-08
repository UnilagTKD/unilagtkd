import { naira } from "@/lib/currency";

// Pre-aggregated in SQL (grouped by period_label) rather than summed here from
// every individual charge - the ledger only ever needs totals, and a club with
// years of dues history would otherwise ship every row just to add them up.
export type FinancePeriodSummary = {
  periodLabel: string;
  count: number;
  total: number;
  collected: number;
  claimed: number;
};

export function FinanceSummary({ periods }: { periods: FinancePeriodSummary[] }) {
  const overall = periods.reduce(
    (acc, p) => ({
      total: acc.total + p.total,
      collected: acc.collected + p.collected,
      claimed: acc.claimed + p.claimed,
    }),
    { total: 0, collected: 0, claimed: 0 }
  );
  const outstanding = overall.total - overall.collected;
  const rate = overall.total === 0 ? 0 : Math.round((overall.collected / overall.total) * 100);

  const tiles = [
    { label: "Charged", value: naira.format(overall.total) },
    { label: "Collected", value: naira.format(overall.collected) },
    { label: "Outstanding", value: naira.format(outstanding) },
    { label: "Awaiting confirmation", value: naira.format(overall.claimed) },
  ];

  const periodRows = periods
    .map((p) => ({ ...p, outstanding: p.total - p.collected }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="rounded-xl border border-black/10 bg-white p-6">
      <h2 className="font-semibold text-brand-black">Collection Ledger</h2>
      <p className="mt-1 text-xs text-zinc-500">
        {rate}% of everything charged has been collected.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-black/10 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">{tile.label}</div>
            <div className="mt-1 text-lg font-bold text-brand-black">{tile.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-brand-red" style={{ width: `${rate}%` }} />
      </div>

      {periodRows.length > 1 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="py-2">Charge</th>
                <th className="py-2">Members</th>
                <th className="py-2">Charged</th>
                <th className="py-2">Collected</th>
                <th className="py-2">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {periodRows.map((p) => (
                <tr key={p.periodLabel}>
                  <td className="py-2 font-medium text-brand-black">{p.periodLabel}</td>
                  <td className="py-2 text-zinc-600">{p.count}</td>
                  <td className="py-2 text-zinc-600">{naira.format(p.total)}</td>
                  <td className="py-2 text-zinc-600">{naira.format(p.collected)}</td>
                  <td className="py-2 text-zinc-600">{naira.format(p.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
