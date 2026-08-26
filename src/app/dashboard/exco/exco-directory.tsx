import { EXCO_POSITION_LABELS, type ExcoPosition } from "@/lib/exco";

export type ExcoDirectoryRow = {
  id: string;
  name: string;
  email: string;
  position: ExcoPosition | null;
};

export function ExcoDirectory({
  rows,
  currentUserId,
}: {
  rows: ExcoDirectoryRow[];
  currentUserId: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-6">
      <h2 className="font-semibold text-brand-black">Executive Committee</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Who holds which portfolio this session.
      </p>
      <ul className="mt-4 divide-y divide-black/5 text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 py-2">
            <div>
              <span className="font-medium text-brand-black">{row.name}</span>
              {row.id === currentUserId && (
                <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                  you
                </span>
              )}
              <div className="text-xs text-zinc-500">{row.email}</div>
            </div>
            <span className="flex-none text-xs font-medium uppercase tracking-wide text-brand-red">
              {row.position ? EXCO_POSITION_LABELS[row.position] : "Unassigned"}
            </span>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-2 text-zinc-500">No exco accounts yet.</li>
        )}
      </ul>
    </div>
  );
}
