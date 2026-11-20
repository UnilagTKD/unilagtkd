"use client";
import { recordSlug } from "@/lib/record-slug";

import Link from "next/link";
import { useState } from "react";
export type MemberSummary = {
  id: string; name: string; age: number | null; belt: string | null; email: string; phone: string | null;
  status: string; present: number; total: number; pct: number | null;
};
export function MemberDirectory({ members }: { members: MemberSummary[] }) {
  const [query, setQuery] = useState("");
  const visible = members.filter((member) => [member.name, member.email, member.phone, member.belt].some(value => value?.toLowerCase().includes(query.trim().toLowerCase())));
  return <div className="space-y-4">
    <label className="block text-sm font-medium">Find a member<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, belt, email, or phone" className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-base" /></label>
    <p className="text-sm text-zinc-500">{visible.length} of {members.length} members</p>
    <ul className="grid gap-4 xl:grid-cols-2">{visible.map(member => <li key={member.id}>
      <Link href={`/dashboard/coach/members/${recordSlug(member.name, member.id)}`} className="block h-full space-y-3 rounded-xl border border-black/10 bg-white p-4 hover:border-brand-red focus-visible:outline-2 focus-visible:outline-brand-red sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="min-w-0 break-words font-semibold text-brand-black">{member.name}</h2><span className="text-xs capitalize text-zinc-500">{member.status}</span></div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-zinc-500">Age</dt><dd>{member.age === null ? "Not recorded" : `${member.age} years`}</dd></div>
          <div><dt className="text-zinc-500">Belt</dt><dd>{member.belt || "Not recorded"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-zinc-500">Attendance record</dt><dd>{member.present}/{member.total} recorded sessions{member.pct === null ? " · No attendance data" : ` · ${member.pct}%`}</dd></div>
          <div className="sm:col-span-2"><dt className="text-zinc-500">Contact</dt><dd className="break-words">{member.phone || "Phone not recorded"}<br />{member.email}</dd></div>
        </dl><p className="text-sm font-semibold text-brand-red">View full profile &rarr;</p>
      </Link>
    </li>)}</ul>
    {visible.length === 0 && <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">No members match your search.</p>}
  </div>;
}
