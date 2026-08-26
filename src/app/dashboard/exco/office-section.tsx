import { getExcoContext } from "@/lib/session";
import {
  EXCO_POSITION_DUTIES,
  EXCO_POSITION_SHORT_LABELS,
} from "@/lib/exco";
import { ACTIVE_MEMBER_ROLES, MEMBER_ROLES } from "@/lib/roles";
import { db } from "@/db";
import {
  announcements,
  users,
  memberProfiles,
  medicalRecords,
  subCommittees,
  dues,
  applications,
  leaveRequests,
  achievements,
  galleryItems,
  insights,
  contactMessages,
} from "@/db/schema";
import { eq, desc, inArray, isNotNull } from "drizzle-orm";
import { AnnouncementForm } from "./announcement-form";
import { DeleteAnnouncementButton } from "./delete-announcement-button";
import { DuesChargeForm } from "./dues-charge-form";
import { IssueReceiptButton } from "./issue-receipt-button";
import { PaymentClaimAlert } from "./payment-claim-alert";
import { FinanceSummary } from "./finance-summary";
import { LeaveRequestsPanel } from "./leave-requests-panel";
import { MemberRegister } from "@/components/dashboard/member-register";
import { WelfarePanel } from "./welfare-panel";
import { ExcoDirectory } from "./exco-directory";
import { SubCommitteeAssign } from "./sub-committee-assign";
import { ApplicationReview } from "@/components/dashboard/application-review";
import { UserRoleSelect } from "@/components/dashboard/user-role-select";
import { ExcoPositionSelect } from "@/components/dashboard/exco-position-select";
import { ToggleStatusButton } from "@/components/dashboard/toggle-status-button";
import { PasswordResetReview } from "@/components/dashboard/password-reset-review";
import { ContactMessageRow } from "@/components/dashboard/contact-message-row";
import { AchievementForm } from "@/components/dashboard/achievement-form";
import { DeleteAchievementButton } from "@/components/dashboard/delete-achievement-button";
import { GalleryForm } from "@/components/dashboard/gallery-form";
import { DeleteGalleryButton } from "@/components/dashboard/delete-gallery-button";
import { InsightForm } from "@/components/dashboard/insight-form";
import { DeleteInsightButton } from "@/components/dashboard/delete-insight-button";

/**
 * The dashboard an exco post adds to a member's account. Their member
 * dashboard is untouched - holding office adds this one alongside it - and it
 * shows only what their post is accountable for.
 */
export async function ExcoOfficeSection() {
  const { user, position, can } = await getExcoContext();

  if (user.role !== "exco") return null;

  const canManageAnnouncements = can("announcements:manage");
  const canViewDues = can("dues:view");
  const canManageDues = can("dues:manage");
  const canViewApplications = can("applications:view");
  const canManageApplications = can("applications:manage");
  const canViewRecords = can("members:records");
  const canAssignMembers = can("members:assign");
  const canViewWelfare = can("welfare:view");
  const canReviewLeave = can("leave:review");
  const canManageRoles = can("members:manage_roles");
  const canManagePasswordResets = can("password_resets:manage");
  const canManageContactMessages = can("contact_messages:manage");
  const canManageContent = can("content:manage");

  const [
    allAnnouncements,
    members,
    allSubCommittees,
    allDues,
    allApplications,
    register,
    welfareRows,
    leaveRows,
    excoMembers,
    allUsersForRoles,
    resetRequests,
    allContactMessages,
    allAchievements,
    allGalleryItems,
    allInsights,
  ] = await Promise.all([
    db.select().from(announcements).orderBy(desc(announcements.createdAt)),
    db
      .select({
        id: users.id,
        email: users.email,
        fullName: memberProfiles.fullName,
        subCommitteeId: memberProfiles.assignedSubCommitteeId,
      })
      .from(users)
      .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
      .where(inArray(users.role, [...ACTIVE_MEMBER_ROLES])),
    db.select().from(subCommittees),
    canViewDues
      ? db
          .select({
            id: dues.id,
            periodLabel: dues.periodLabel,
            amount: dues.amount,
            paid: dues.paid,
            paymentClaimed: dues.paymentClaimed,
            paymentReference: dues.paymentReference,
            receiptNo: dues.receiptNo,
            userFullName: memberProfiles.fullName,
            userEmail: users.email,
          })
          .from(dues)
          .innerJoin(users, eq(dues.userId, users.id))
          .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
          .orderBy(desc(dues.createdAt))
      : [],
    canViewApplications
      ? db.select().from(applications).orderBy(desc(applications.createdAt))
      : [],
    canViewRecords
      ? db
          .select({
            id: users.id,
            email: users.email,
            fullName: memberProfiles.fullName,
            phone: memberProfiles.phone,
            membershipCategory: memberProfiles.membershipCategory,
            department: memberProfiles.department,
            levelYear: memberProfiles.levelYear,
            beltGrade: memberProfiles.beltGrade,
            subCommitteeName: subCommittees.name,
          })
          .from(users)
          .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
          .leftJoin(subCommittees, eq(subCommittees.id, memberProfiles.assignedSubCommitteeId))
          .where(inArray(users.role, [...MEMBER_ROLES]))
      : [],
    canViewWelfare
      ? db
          .select({
            id: users.id,
            fullName: memberProfiles.fullName,
            email: users.email,
            phone: memberProfiles.phone,
            bloodGroup: medicalRecords.bloodGroup,
            genotype: medicalRecords.genotype,
            allergies: medicalRecords.allergies,
            chronicConditions: medicalRecords.chronicConditions,
            recentInjuries: medicalRecords.recentInjuries,
            emergencyContactName: medicalRecords.emergencyContactName,
            emergencyContactRelationship: medicalRecords.emergencyContactRelationship,
            emergencyContactPhone: medicalRecords.emergencyContactPhone,
          })
          .from(users)
          .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
          .leftJoin(medicalRecords, eq(medicalRecords.userId, users.id))
          .where(inArray(users.role, [...MEMBER_ROLES]))
      : [],
    canReviewLeave
      ? db
          .select({
            id: leaveRequests.id,
            reasonCategory: leaveRequests.reasonCategory,
            startDate: leaveRequests.startDate,
            endDate: leaveRequests.endDate,
            details: leaveRequests.details,
            status: leaveRequests.status,
            reviewNotes: leaveRequests.reviewNotes,
            memberName: memberProfiles.fullName,
            memberEmail: users.email,
          })
          .from(leaveRequests)
          .innerJoin(users, eq(leaveRequests.userId, users.id))
          .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
          .orderBy(desc(leaveRequests.createdAt))
      : [],
    db
      .select({
        id: users.id,
        email: users.email,
        fullName: memberProfiles.fullName,
        position: users.excoPosition,
      })
      .from(users)
      .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
      .where(eq(users.role, "exco")),
    canManageRoles
      ? db
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
          .orderBy(desc(users.createdAt))
      : [],
    canManagePasswordResets
      ? db
          .select({
            id: users.id,
            email: users.email,
            fullName: memberProfiles.fullName,
            resetRequestedAt: users.resetRequestedAt,
          })
          .from(users)
          .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
          .where(isNotNull(users.resetRequestedAt))
          .orderBy(desc(users.resetRequestedAt))
      : [],
    canManageContactMessages
      ? db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt))
      : [],
    canManageContent
      ? db.select().from(achievements).orderBy(desc(achievements.competitionDate))
      : [],
    canManageContent ? db.select().from(galleryItems).orderBy(desc(galleryItems.createdAt)) : [],
    canManageContent ? db.select().from(insights).orderBy(desc(insights.createdAt)) : [],
  ]);

  const unreadMessageCount = allContactMessages.filter((m) => !m.read).length;

  const pendingApplications = allApplications.filter((a) => a.status === "pending");
  const outstandingDues = allDues.filter((d) => !d.paid);
  const pendingClaims = allDues.filter((d) => d.paymentClaimed && !d.paid);
  const pendingLeave = leaveRows.filter((r) => r.status === "pending");

  const heading = position ? `${EXCO_POSITION_SHORT_LABELS[position]} Dashboard` : "Exco Dashboard";

  const duties = position ? EXCO_POSITION_DUTIES[position] : null;

  return (
    <section className="space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-widest text-brand-red">
          Executive Committee
        </span>
        <h1 className="mt-1 text-2xl font-bold text-brand-black">{heading}</h1>
        {duties && <p className="mt-1 max-w-2xl text-sm text-zinc-500">{duties}</p>}
      </div>

      {!position && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
          You have not been assigned an executive office yet, so this dashboard is
          read-only. Ask the General Secretary to set your office.
        </div>
      )}

      {canManageDues && <PaymentClaimAlert initialCount={pendingClaims.length} />}

      <div className="grid gap-4 sm:grid-cols-3">
        {canViewApplications && (
          <div className="rounded-xl border border-black/10 bg-white p-5">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Pending Applications</div>
            <div className="mt-1 text-2xl font-bold text-brand-black">{pendingApplications.length}</div>
          </div>
        )}
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Active Members</div>
          <div className="mt-1 text-2xl font-bold text-brand-black">{members.length}</div>
        </div>
        {canViewDues && (
          <div className="rounded-xl border border-black/10 bg-white p-5">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Dues Outstanding</div>
            <div className="mt-1 text-2xl font-bold text-brand-black">{outstandingDues.length}</div>
          </div>
        )}
        {canReviewLeave && (
          <div className="rounded-xl border border-black/10 bg-white p-5">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Leave Requests</div>
            <div className="mt-1 text-2xl font-bold text-brand-black">{pendingLeave.length}</div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">Announcements</h2>
        {canManageAnnouncements ? (
          <div className="mt-4">
            <AnnouncementForm />
          </div>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">
            Read-only. Announcements are posted by the President, Vice President, and
            General Secretary.
          </p>
        )}
        <ul className="mt-6 divide-y divide-black/5">
          {allAnnouncements.map((a) => (
            <li key={a.id} className="flex items-start justify-between py-3">
              <div>
                <div className="text-sm font-semibold text-brand-black">{a.title}</div>
                <p className="mt-1 text-sm text-zinc-600">{a.body}</p>
                <span className="mt-1 inline-block text-xs uppercase tracking-wide text-zinc-400">
                  {a.audience}
                </span>
              </div>
              {canManageAnnouncements && <DeleteAnnouncementButton id={a.id} />}
            </li>
          ))}
          {allAnnouncements.length === 0 && (
            <li className="py-2 text-sm text-zinc-500">No announcements yet.</li>
          )}
        </ul>
      </div>

      {canReviewLeave && (
        <LeaveRequestsPanel
          requests={leaveRows.map((r) => ({
            id: r.id,
            memberName: r.memberName ?? r.memberEmail,
            reasonCategory: r.reasonCategory,
            startDate: r.startDate,
            endDate: r.endDate,
            details: r.details,
            status: r.status,
            reviewNotes: r.reviewNotes,
          }))}
        />
      )}

      {canViewWelfare && (
        <WelfarePanel
          rows={welfareRows.map((r) => ({
            id: r.id,
            name: r.fullName ?? r.email,
            phone: r.phone,
            bloodGroup: r.bloodGroup,
            genotype: r.genotype,
            allergies: r.allergies,
            chronicConditions: r.chronicConditions,
            recentInjuries: r.recentInjuries,
            emergencyContactName: r.emergencyContactName,
            emergencyContactRelationship: r.emergencyContactRelationship,
            emergencyContactPhone: r.emergencyContactPhone,
          }))}
        />
      )}

      {canViewDues && (
        <>
          <FinanceSummary
            rows={allDues.map((d) => ({
              amount: d.amount,
              paid: d.paid,
              paymentClaimed: d.paymentClaimed,
            }))}
          />

          <div className="rounded-xl border border-black/10 bg-white p-6">
            <h2 className="font-semibold text-brand-black">Dues Overview</h2>
            {canManageDues ? (
              <div className="mt-4">
                <DuesChargeForm students={members.map((m) => ({ id: m.id, name: m.fullName ?? m.email }))} />
              </div>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">
                Read-only. Charges are raised and payments confirmed by the Treasurer.
              </p>
            )}
            <ul className="mt-6 divide-y divide-black/5 text-sm">
              {allDues.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    {d.userFullName ?? d.userEmail}, {d.periodLabel}: &#8358;{d.amount}
                    {d.paymentClaimed && !d.paid && d.paymentReference && (
                      <span className="ml-1 text-xs text-zinc-400">
                        (ref: {d.paymentReference})
                      </span>
                    )}
                  </span>
                  <div className="flex flex-none items-center gap-2">
                    {d.paid ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        {d.receiptNo ? `Receipt ${d.receiptNo}` : "Paid (no receipt)"}
                      </span>
                    ) : (
                      <>
                        {d.paymentClaimed && (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                            Claimed
                          </span>
                        )}
                        {canManageDues ? (
                          <IssueReceiptButton duesId={d.id} />
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                            Unpaid
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
              {allDues.length === 0 && (
                <li className="py-2 text-zinc-500">No dues charged yet.</li>
              )}
            </ul>
          </div>
        </>
      )}

      <div className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">Sub-Committees</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {allSubCommittees.map((sc) => {
            const committeeMembers = members.filter((m) => m.subCommitteeId === sc.id);
            return (
              <div key={sc.id} className="rounded-lg border border-black/10 p-4">
                <div className="font-medium text-brand-black">{sc.name}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {committeeMembers.length} member(s)
                </div>
                <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                  {committeeMembers.map((m) => (
                    <li key={m.id}>{m.fullName ?? m.email}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {canAssignMembers && (
          <div className="mt-6 border-t border-black/5 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Assignments
            </h3>
            <ul className="mt-2 divide-y divide-black/5 text-sm">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-brand-black">{m.fullName ?? m.email}</span>
                  <SubCommitteeAssign
                    userId={m.id}
                    currentSubCommitteeId={m.subCommitteeId}
                    subCommittees={allSubCommittees.map((sc) => ({ id: sc.id, name: sc.name }))}
                  />
                </li>
              ))}
              {members.length === 0 && (
                <li className="py-2 text-zinc-500">No members to assign yet.</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {canViewRecords && (
        <MemberRegister
          note="The club record of every active member, kept by the General Secretary."
          rows={register.map((r) => ({
            id: r.id,
            name: r.fullName ?? r.email,
            email: r.email,
            phone: r.phone,
            membershipCategory: r.membershipCategory,
            department: r.department,
            levelYear: r.levelYear,
            beltGrade: r.beltGrade,
            subCommitteeName: r.subCommitteeName,
          }))}
        />
      )}

      {canViewApplications && (
        <div className="rounded-xl border border-black/10 bg-white p-6">
          <h2 className="font-semibold text-brand-black">
            Applications Pipeline ({pendingApplications.length} pending)
          </h2>
          {canManageApplications ? (
            <p className="mt-1 text-xs text-zinc-500">
              Approving activates the applicant&apos;s account and hands you a setup link to
              share with them.
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">
              Read-only. Applications are reviewed by the General Secretary or coaches.
            </p>
          )}
          {canManageApplications ? (
            <div className="mt-4 space-y-4">
              {pendingApplications.map((a) => (
                <ApplicationReview key={a.id} application={a} />
              ))}
              {pendingApplications.length === 0 && (
                <p className="text-sm text-zinc-500">No pending applications.</p>
              )}
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-black/5 text-sm">
              {pendingApplications.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <span>
                    {a.fullName}, {a.membershipCategory}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
              {pendingApplications.length === 0 && (
                <li className="py-2 text-zinc-500">No pending applications.</li>
              )}
            </ul>
          )}
        </div>
      )}

      <ExcoDirectory
        rows={excoMembers.map((m) => ({
          id: m.id,
          name: m.fullName ?? m.email,
          email: m.email,
          position: m.position,
        }))}
        currentUserId={user.id}
      />

      {canManagePasswordResets && resetRequests.length > 0 && (
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

      {canManageRoles && (
        <div className="rounded-xl border border-black/10 bg-white p-6">
          <h2 className="font-semibold text-brand-black">
            Users &amp; Roles ({allUsersForRoles.length})
          </h2>
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
                {allUsersForRoles.map((u) => (
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
      )}

      {canManageContent && (
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
      )}

      {canManageContent && (
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
      )}

      {canManageContent && (
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
      )}

      {canManageContactMessages && (
        <div className="rounded-xl border border-black/10 bg-white p-6">
          <h2 className="font-semibold text-brand-black">
            Contact Messages {unreadMessageCount > 0 && `(${unreadMessageCount} unread)`}
          </h2>
          <ul className="mt-4 divide-y divide-black/5">
            {allContactMessages.map((m) => (
              <ContactMessageRow key={m.id} message={m} />
            ))}
            {allContactMessages.length === 0 && (
              <li className="py-2 text-sm text-zinc-500">No messages yet.</li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
