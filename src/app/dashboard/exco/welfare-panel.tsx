export type WelfareRow = {
  id: string;
  name: string;
  phone: string | null;
  bloodGroup: string | null;
  genotype: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  recentInjuries: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
};

function hasFlag(value: string | null) {
  if (!value) return false;
  const normalised = value.trim().toLowerCase();
  return normalised !== "" && normalised !== "none" && normalised !== "nil";
}

function medicalFlags(row: WelfareRow) {
  return [
    hasFlag(row.allergies) ? `Allergies: ${row.allergies}` : null,
    hasFlag(row.chronicConditions) ? `Chronic: ${row.chronicConditions}` : null,
    hasFlag(row.recentInjuries) ? `Injury: ${row.recentInjuries}` : null,
  ].filter((f): f is string => f !== null);
}

export function WelfarePanel({ rows }: { rows: WelfareRow[] }) {
  const flagged = rows.filter((r) => medicalFlags(r).length > 0);
  const missingEmergencyContact = rows.filter((r) => !r.emergencyContactPhone);

  // Members needing attention first, then the rest of the register.
  const ordered = [...rows].sort(
    (a, b) => medicalFlags(b).length - medicalFlags(a).length
  );

  return (
    <div className="rounded-xl border border-black/10 bg-white p-6">
      <h2 className="font-semibold text-brand-black">Medical Readiness</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Confidential. Held by the Welfare Officer for first-aid and travel
        preparation - do not share outside the welfare portfolio.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-black/10 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            Members with medical flags
          </div>
          <div className="mt-1 text-2xl font-bold text-brand-black">{flagged.length}</div>
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            Missing emergency contact
          </div>
          <div className="mt-1 text-2xl font-bold text-brand-black">
            {missingEmergencyContact.length}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="py-2">Member</th>
              <th className="py-2">Blood / Genotype</th>
              <th className="py-2">Flags</th>
              <th className="py-2">Emergency Contact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {ordered.map((row) => {
              const flags = medicalFlags(row);
              return (
                <tr key={row.id}>
                  <td className="py-2">
                    <div className="font-medium text-brand-black">{row.name}</div>
                    {row.phone && <div className="text-xs text-zinc-500">{row.phone}</div>}
                  </td>
                  <td className="py-2 text-zinc-600">
                    {row.bloodGroup ?? "-"} / {row.genotype ?? "-"}
                  </td>
                  <td className="py-2">
                    {flags.length === 0 ? (
                      <span className="text-xs text-zinc-400">Clear</span>
                    ) : (
                      <ul className="space-y-0.5 text-xs text-brand-red">
                        {flags.map((flag) => (
                          <li key={flag}>{flag}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="py-2 text-zinc-600">
                    {row.emergencyContactPhone ? (
                      <>
                        <div className="text-xs font-medium text-brand-black">
                          {row.emergencyContactName ?? "Unnamed"}
                          {row.emergencyContactRelationship
                            ? ` (${row.emergencyContactRelationship})`
                            : ""}
                        </div>
                        <div className="text-xs">{row.emergencyContactPhone}</div>
                      </>
                    ) : (
                      <span className="text-xs text-brand-red">Not on file</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {ordered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-zinc-500">
                  No member medical records on file yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
