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
      <h2 className="font-semibold text-brand-black">Member Register ({rows.length})</h2>
      <p className="mt-1 text-xs text-zinc-500">{note}</p>
      <div className="mt-4 overflow-x-auto">
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
