"use client";

import { useState } from "react";
import type { MemberRegisterRow } from "./member-register";

const FILTERS = [
  { value: "undergraduate", label: "Undergraduates only" },
  { value: "all", label: "All members" },
] as const;

const COLUMNS: { header: string; value: (row: MemberRegisterRow) => string }[] = [
  { header: "Name", value: (r) => r.name },
  { header: "Email", value: (r) => r.email },
  { header: "Phone", value: (r) => r.phone ?? "" },
  { header: "Category", value: (r) => r.membershipCategory?.replace("_", " ") ?? "" },
  { header: "Department", value: (r) => r.department ?? "" },
  { header: "Level", value: (r) => r.levelYear ?? "" },
  { header: "Belt", value: (r) => r.beltGrade ?? "" },
  { header: "Sub-Committee", value: (r) => r.subCommitteeName ?? "" },
];

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(rows: MemberRegisterRow[]): string {
  const header = COLUMNS.map((c) => csvField(c.header)).join(",");
  const lines = rows.map((row) => COLUMNS.map((c) => csvField(c.value(row))).join(","));
  return [header, ...lines].join("\r\n");
}

export function DownloadMembersButton({ rows }: { rows: MemberRegisterRow[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("undergraduate");

  const filteredRows =
    filter === "undergraduate" ? rows.filter((r) => r.membershipCategory === "undergraduate") : rows;

  function download() {
    const csv = toCsv(filteredRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `unilag-tkd-members-${filter}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value as (typeof FILTERS)[number]["value"])}
        className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700"
      >
        {FILTERS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={download}
        disabled={filteredRows.length === 0}
        className="rounded-full bg-brand-red px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        Download CSV ({filteredRows.length})
      </button>
    </div>
  );
}
