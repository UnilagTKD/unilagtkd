import { DuesChargeForm } from "@/app/dashboard/exco/dues-charge-form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { dues, memberProfiles, users } from "@/db/schema";
import { getExcoContext } from "@/lib/session";
import { recordSlug } from "@/lib/record-slug";
import { naira } from "@/lib/currency";

export default async function TreasurerLogbookPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; status?: string }> }) {
  const context = await getExcoContext();
  if (!context.can("dues:manage")) redirect(`/dashboard/${context.user.role}`);
  const members = await db.select({ id: users.id, name: memberProfiles.fullName, email: users.email }).from(users).leftJoin(memberProfiles, eq(memberProfiles.userId, users.id)).orderBy(users.email);
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 150) : "";
  const page = /^\d{1,6}$/.test(query.page ?? "") ? Math.max(1, Number(query.page)) : 1;
  const filters: SQL[] = [];
  if (query.status === "paid") filters.push(eq(dues.paid, true));
  else if (query.status === "pending") filters.push(and(eq(dues.paid, false), eq(dues.paymentClaimed, true))!);
  else if (query.status === "unpaid") filters.push(eq(dues.paid, false));
  if (search) filters.push(or(ilike(dues.periodLabel, `%${search}%`), ilike(memberProfiles.fullName, `%${search}%`), ilike(users.email, `%${search}%`))!);
  const where = and(...filters);
  const [entries, [totals]] = await Promise.all([
    db.select({ id: dues.id, purpose: dues.periodLabel, amount: dues.amount, createdAt: dues.createdAt, paidAt: dues.paidAt, paid: dues.paid, claimed: dues.paymentClaimed, name: memberProfiles.fullName, email: users.email }).from(dues).innerJoin(users, eq(users.id, dues.userId)).leftJoin(memberProfiles, eq(memberProfiles.userId, users.id)).where(where).orderBy(desc(dues.createdAt), desc(dues.id)).limit(50).offset((page - 1) * 50),
    db.select({ count: count() }).from(dues).innerJoin(users, eq(users.id, dues.userId)).leftJoin(memberProfiles, eq(memberProfiles.userId, users.id)).where(where),
  ]);
  const pageHref = (value: number) => `/dashboard/treasury/logbook?${new URLSearchParams({ page: String(value), q: search, status: query.status ?? "" })}`;
  return <div className="max-w-5xl space-y-6">
    <header><h1 className="text-2xl font-bold">Treasurer logbook</h1><p className="mt-1 text-sm text-zinc-500">Payment claims, charges, confirmed amounts, purposes, and important dates. Open an entry to review its details.</p></header>
    <section className="space-y-3 rounded-xl border bg-white p-5"><h2 className="font-semibold">Existing member debts</h2><p className="text-sm text-zinc-600">Record the outstanding balance and include its original semester in the purpose. Check for duplicates first. Entries remain unpaid until payment is confirmed; recording a debt does not issue a receipt.</p><DuesChargeForm existingDebt students={members.map(member => ({ id: member.id, name: member.name || member.email }))}/></section>
    <form className="flex flex-wrap gap-3"><input name="q" defaultValue={search} maxLength={150} placeholder="Member, email, or payment purpose" aria-label="Search logbook" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" /><select name="status" defaultValue={query.status ?? ""} aria-label="Payment status" className="rounded-lg border px-3 py-2 text-sm"><option value="">All entries</option><option value="paid">Confirmed payments</option><option value="pending">Pending claims</option><option value="unpaid">Unpaid charges</option></select><button className="rounded-full bg-brand-blue px-5 py-2 text-sm font-semibold text-white">Filter</button></form>
    <p className="text-sm text-zinc-500">{totals.count} entries · Page {page}</p>
    <ul className="divide-y rounded-xl border border-black/10 bg-white p-4 sm:p-6">{entries.map(entry => <li key={entry.id}><Link href={`/dashboard/treasury/logbook/${recordSlug(entry.purpose, entry.id)}`} className="flex flex-col gap-2 py-4 hover:text-brand-blue sm:flex-row sm:justify-between"><div><h2 className="font-semibold">{entry.name ?? entry.email}</h2><p className="mt-1 break-words text-sm">{entry.purpose}</p><p className="mt-1 text-xs text-zinc-500">Recorded {entry.createdAt.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}{entry.paidAt ? ` · Confirmed ${entry.paidAt.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}` : ""}</p></div><div className="text-sm"><p className="font-semibold">{naira.format(Number(entry.amount))}</p><p className="mt-1 text-zinc-500">{entry.paid ? "Confirmed" : entry.claimed ? "Claim awaiting verification" : "Unpaid"}</p><p className="mt-2 font-medium text-brand-blue">View details &rarr;</p></div></Link></li>)}</ul>
    {!entries.length && <p className="text-sm text-zinc-500">No matching entries.</p>}
    <nav aria-label="Logbook pages" className="flex justify-between text-sm font-semibold text-brand-blue">{page > 1 ? <Link href={pageHref(page - 1)}>Previous page</Link> : <span />}{page * 50 < totals.count && <Link href={pageHref(page + 1)}>Next page</Link>}</nav>
  </div>;
}
