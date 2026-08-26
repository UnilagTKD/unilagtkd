import type { ReactNode } from "react";

export function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-brand-red">{error}</p>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red";
