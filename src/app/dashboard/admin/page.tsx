import { requireRole } from "@/lib/session";
import { db } from "@/db";
import {
  users,
  memberProfiles,
  applications,
  achievements,
  galleryItems,
  insights,
  contactMessages,
} from "@/db/schema";
import { eq, desc, isNotNull } from "drizzle-orm";
import { UserRoleSelect } from "./user-role-select";
import { ExcoPositionSelect } from "./exco-position-select";
import { ToggleStatusButton } from "./toggle-status-button";
import { ApplicationReview } from "@/components/dashboard/application-review";
import { PasswordResetReview } from "./password-reset-review";
import { AchievementForm } from "./achievement-form";
import { DeleteAchievementButton } from "./delete-achievement-button";
import { GalleryForm } from "./gallery-form";
import { DeleteGalleryButton } from "./delete-gallery-button";
import { InsightForm } from "./insight-form";
import { DeleteInsightButton } from "./delete-insight-button";
import { ContactMessageRow } from "./contact-message-row";

export default async function AdminDashboardPage() {
  await requireRole(["admin"]);

  const [
    allUsers,
    pendingApplications,
    allAchievements,
    allGalleryItems,
    allInsights,
    allMessages,
    resetRequests,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        excoPosition: users.excoPosition,
        status: users.status,
        fullName: memberProfiles.fullName,
      })
      .from(users)
      .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
      .orderBy(desc(users.createdAt)),
    db
      .select()
      .from(applications)
      .where(eq(applications.status, "pending"))
      .orderBy(desc(applications.createdAt)),
    db.select().from(achievements).orderBy(desc(achievements.competitionDate)),
    db.select().from(galleryItems).orderBy(desc(galleryItems.createdAt)),
    db.select().from(insights).orderBy(desc(insights.createdAt)),
    db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)),
    db
      .select({
        id: users.id,
        email: users.email,
        fullName: memberProfiles.fullName,
        resetRequestedAt: users.resetRequestedAt,
      })
      .from(users)
      .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
      .where(isNotNull(users.resetRequestedAt))
      .orderBy(desc(users.resetRequestedAt)),
  ]);

  const unreadCount = allMessages.filter((m) => !m.read).length;

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Admin Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Users, applications, achievements, and gallery content
        </p>
      </div>

      {resetRequests.length > 0 && (
        <div className="rounded-xl border border-brand-red/30 bg-white p-6">
          <h2 className="font-semibold text-brand-black">
            Password Reset Requests ({resetRequests.length})
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            The site cannot email reset links, so you issue them here and pass them to
            the member directly.
          </p>
          <div className="mt-4 space-y-4">
            {resetRequests.map((r) => (
              <PasswordResetReview key={r.id} request={r} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">
          Pending Applications ({pendingApplications.length})
        </h2>
        {pendingApplications.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No pending applications.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {pendingApplications.map((a) => (
              <ApplicationReview key={a.id} application={a} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">Users &amp; Roles ({allUsers.length})</h2>
        <div className="mt-4 overflow-x-auto">
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
              {allUsers.map((u) => (
                <tr key={u.id}>
                  <td className="py-2">{u.fullName ?? "-"}</td>
                  <td className="py-2 text-zinc-600">{u.email}</td>
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
                    <span
                      className={
                        u.status === "active"
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                          : "rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600"
                      }
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <ToggleStatusButton userId={u.id} currentStatus={u.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">Achievements</h2>
        <div className="mt-4">
          <AchievementForm />
        </div>
        <ul className="mt-6 divide-y divide-black/5 text-sm">
          {allAchievements.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <span>
                {a.athleteName}, {a.medal}, {a.competitionName} ({a.competitionDate})
              </span>
              <DeleteAchievementButton id={a.id} />
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">Gallery</h2>
        <div className="mt-4">
          <GalleryForm />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {allGalleryItems.map((g) => (
            <div key={g.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.imageUrl} alt={g.caption ?? ""} className="aspect-square w-full rounded-lg object-cover" />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-zinc-500">{g.category}</span>
                <DeleteGalleryButton id={g.id} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">Insights / Blog</h2>
        <div className="mt-4">
          <InsightForm />
        </div>
        <ul className="mt-6 divide-y divide-black/5 text-sm">
          {allInsights.map((post) => (
            <li key={post.id} className="flex items-center justify-between py-2">
              <span>
                {post.title}, <span className="text-zinc-500">{post.category}</span>
              </span>
              <DeleteInsightButton id={post.id} />
            </li>
          ))}
          {allInsights.length === 0 && <li className="py-2 text-zinc-500">No posts yet.</li>}
        </ul>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">
          Contact Messages {unreadCount > 0 && `(${unreadCount} unread)`}
        </h2>
        <ul className="mt-4 divide-y divide-black/5">
          {allMessages.map((m) => (
            <ContactMessageRow key={m.id} message={m} />
          ))}
          {allMessages.length === 0 && (
            <li className="py-2 text-sm text-zinc-500">No messages yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
