import { UserRoleSelect } from "./user-role-select";
import { ExcoPositionSelect } from "./exco-position-select";
import { ToggleStatusButton } from "./toggle-status-button";
import type { UserRole } from "@/types/next-auth";
import { EXCO_POSITION_LABELS, type ExcoPosition } from "@/lib/exco";

export type UserRoleRow = {
  id: string;
  email: string;
  role: UserRole;
  excoPosition: ExcoPosition | null;
  status: "active" | "inactive";
  fullName: string | null;
};

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  return (
    <span
      className={
        status === "active"
          ? "flex-none rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
          : "flex-none rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600"
      }
    >
      {status}
    </span>
  );
}

export function UsersRolesTable({
  rows,
  currentUserId,
}: {
  rows: UserRoleRow[];
  currentUserId: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-6">
      <h2 className="font-semibold text-brand-black">Users &amp; Roles ({rows.length})</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Your own row is shown for confirmation only &mdash; change your own role or status from
        another officer&apos;s account.
      </p>

      {/* Mobile: stacked cards, no horizontal scrolling required. */}
      <div className="mt-4 space-y-3 sm:hidden">
        {rows.map((u) => {
          const isSelf = u.id === currentUserId;
          return (
            <div key={u.id} className="rounded-lg border border-black/10 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate font-medium text-brand-black">
                    {u.fullName ?? "-"}
                    {isSelf && (
                      <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                        you
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-zinc-500">{u.email}</div>
                </div>
                <StatusBadge status={u.status} />
              </div>
              {isSelf ? (
                <p className="mt-3 text-xs text-zinc-500">
                  {u.role}
                  {u.excoPosition ? ` · ${EXCO_POSITION_LABELS[u.excoPosition]}` : ""}
                </p>
              ) : (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-zinc-400">Role</div>
                      <div className="mt-1 [&>select]:w-full">
                        <UserRoleSelect userId={u.id} currentRole={u.role} />
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-zinc-400">
                        Exco Office
                      </div>
                      <div className="mt-1 [&>select]:w-full">
                        <ExcoPositionSelect
                          userId={u.id}
                          currentRole={u.role}
                          currentPosition={u.excoPosition}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ToggleStatusButton userId={u.id} currentStatus={u.status} />
                  </div>
                </>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-sm text-zinc-500">No users yet.</p>}
      </div>

      {/* Desktop / tablet: table. */}
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Exco Office</th>
              <th className="py-2">Status</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id}>
                  <td className="py-2">
                    {u.fullName ?? "-"}
                    {isSelf && (
                      <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                        you
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-zinc-600">{u.email}</td>
                  {isSelf ? (
                    <>
                      <td className="py-2 text-zinc-600">{u.role}</td>
                      <td className="py-2 text-zinc-600">
                        {u.excoPosition ? EXCO_POSITION_LABELS[u.excoPosition] : "-"}
                      </td>
                      <td className="py-2">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="py-2 text-xs text-zinc-400">Confirmation only</td>
                    </>
                  ) : (
                    <>
                      <td className="py-2">
                        <UserRoleSelect userId={u.id} currentRole={u.role} />
                      </td>
                      <td className="py-2">
                        <ExcoPositionSelect
                          userId={u.id}
                          currentRole={u.role}
                          currentPosition={u.excoPosition}
                        />
                      </td>
                      <td className="py-2">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="py-2">
                        <ToggleStatusButton userId={u.id} currentStatus={u.status} />
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-3 text-zinc-500">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
