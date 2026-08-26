export type FinanceRow = {
  amount: string;
  paid: boolean;
  paymentClaimed: boolean;
};

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function FinanceSummary({ rows }: { rows: FinanceRow[] }) {
  const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
  const collected = rows
    .filter((r) => r.paid)
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const claimed = rows
    .filter((r) => r.paymentClaimed && !r.paid)
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const outstanding = total - collected;
  const rate = total === 0 ? 0 : Math.round((collected / total) * 100);

  const tiles = [
    { label: "Charged", value: naira.format(total) },
    { label: "Collected", value: naira.format(collected) },
    { label: "Outstanding", value: naira.format(outstanding) },
    { label: "Awaiting confirmation", value: naira.format(claimed) },
  ];

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
    </div>
  );
}
