import { desc } from "drizzle-orm";
import { ContactMessageRow } from "@/components/dashboard/contact-message-row";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { requireRole } from "@/lib/session";

export default async function ContactMessagesPage() {
  await requireRole(["coach", "admin"]);
  const messages = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  const unreadCount = messages.filter((message) => !message.read).length;

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-black">Contact messages</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Messages submitted through the website contact form. {unreadCount} unread.
        </p>
      </header>
      <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
        <ul className="divide-y divide-black/5">
          {messages.map((message) => (
            <ContactMessageRow key={message.id} message={message} canDelete={false} />
          ))}
          {messages.length === 0 && <li className="py-2 text-sm text-zinc-500">No messages yet.</li>}
        </ul>
      </section>
    </div>
  );
}
