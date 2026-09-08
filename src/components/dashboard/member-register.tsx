import { DownloadMembersButton } from "./download-members-button";

export type MemberRegisterRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  membershipCategory: string | null;
  department: string | null;
  levelYear: string | null;
  beltGrade: string | null;
  subCommitteeName: string | null;
};

export function MemberRegister({
  rows,
  note = "The club record of every active member.",
}: {
  rows: MemberRegisterRow[];
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-brand-black">Member Register ({rows.length})</h2>
        <DownloadMembersButton rows={rows} />
      </div>
      <p className="mt-1 text-xs text-zinc-500">{note}</p>

      {/* Mobile: stacked cards, no horizontal scrolling required. */}
      <div className="mt-4 space-y-3 sm:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-black/10 p-3 text-sm">
            <div className="font-medium text-brand-black">{row.name}</div>
            <div className="mt-1 text-xs text-zinc-500">{row.email}</div>
            {row.phone && <div className="text-xs text-zinc-500">{row.phone}</div>}
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div>
                <dt className="text-zinc-400">Category</dt>
                <dd className="text-zinc-700">{row.membershipCategory?.replace("_", " ") ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">Department / Level</dt>
                <dd className="text-zinc-700">
                  {row.department ?? "-"}
                  {row.levelYear ? ` (${row.levelYear})` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-400">Belt</dt>
                <dd className="text-zinc-700">{row.beltGrade ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">Sub-Committee</dt>
                <dd className="text-zinc-700">{row.subCommitteeName ?? "Unassigned"}</dd>
              </div>
            </dl>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-zinc-500">No members on the register yet.</p>
        )}
      </div>

      {/* Desktop / tablet: table. */}
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Contact</th>
              <th className="py-2">Category</th>
              <th className="py-2">Department / Level</th>
              <th className="py-2">Belt</th>
              <th className="py-2">Sub-Committee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-2 font-medium text-brand-black">{row.name}</td>
                <td className="py-2 text-zinc-600">
                  <div className="text-xs">{row.email}</div>
                  {row.phone && <div className="text-xs">{row.phone}</div>}
                </td>
                <td className="py-2 text-zinc-600">
                  {row.membershipCategory?.replace("_", " ") ?? "-"}
                </td>
                <td className="py-2 text-zinc-600">
                  {row.department ?? "-"}
                  {row.levelYear ? ` (${row.levelYear})` : ""}
                </td>
                <td className="py-2 text-zinc-600">{row.beltGrade ?? "-"}</td>
                <td className="py-2 text-zinc-600">{row.subCommitteeName ?? "Unassigned"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-3 text-zinc-500">
                  No members on the register yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
