import Link from "next/link";
import { and, eq, desc, count, isNull, sql, getTableColumns } from "drizzle-orm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { readNotification, retryNotificationEmail } from "./actions";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const input = (await searchParams).page;
  const page = input && /^[1-9]\d{0,5}$/.test(input) ? Number(input) : 1;
  const own = eq(notifications.userId, session.user.id);
  const [items, [total], [unread]] = await Promise.all([
    db.select({ ...getTableColumns(notifications), canRetry: sql<boolean>`${notifications.emailStatus} in ('pending','failed') or (${notifications.emailStatus}='sending' and ${notifications.emailClaimedAt} < now()-interval '5 minutes')` }).from(notifications).where(own).orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(25).offset((page - 1) * 25),
    db.select({ value: count() }).from(notifications).where(own),
    db.select({ value: count() }).from(notifications).where(and(own, isNull(notifications.readAt))),
  ]);
  return <div className="max-w-4xl space-y-6">
    <header><h1 className="text-2xl font-bold">Notifications</h1><p className="mt-2 text-sm text-zinc-500">{unread.value} unread. Updates about your account and requests.</p></header>
    <ul className="space-y-3">{items.map(item => <li key={item.id} className={`rounded-xl border p-4 sm:p-6 ${item.readAt ? "border-zinc-200 bg-white" : "border-blue-200 bg-blue-50"}`}>
      <h2 className="font-semibold">{item.title}</h2><p className="mt-2 text-sm text-zinc-700">{item.message}</p>
      <p className="mt-2 text-xs text-zinc-500">{item.createdAt.toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} · Email: {item.emailStatus === "sent" ? "submitted" : item.emailStatus}</p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm"><Link href={item.href} className="font-semibold text-brand-blue hover:underline">View details</Link>
        {!item.readAt && <form action={readNotification.bind(null, item.id)}><button className="text-brand-blue hover:underline">Mark as read</button></form>}
        {item.canRetry && <form action={retryNotificationEmail.bind(null, item.id)}><button className="text-brand-blue hover:underline">Retry email</button></form>}
      </div>
    </li>)}</ul>
    {!items.length && <p className="text-sm text-zinc-500">No notifications yet.</p>}
    <nav className="flex gap-4 text-sm text-brand-blue" aria-label="Notification pages">{page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}{page * 25 < total.value && <Link href={`?page=${page + 1}`}>Next</Link>}</nav>
  </div>;
}
