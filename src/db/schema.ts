import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  date,
  numeric,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["student", "coach", "exco", "alumni"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);
export const applicationStatusEnum = pgEnum("application_status", [
  "pending",
  "approved",
  "rejected",
]);
export const membershipCategoryEnum = pgEnum("membership_category", [
  "undergraduate",
  "postgraduate",
  "alumni",
  "non_student",
]);
export const medalEnum = pgEnum("medal", ["gold", "silver", "bronze"]);
export const galleryCategoryEnum = pgEnum("gallery_category", [
  "training",
  "demo",
  "tournament",
]);
export const announcementAudienceEnum = pgEnum("announcement_audience", [
  "all",
  "students",
  "coaches",
  "exco",
]);
export const leadershipCategoryEnum = pgEnum("leadership_category", [
  "head_coach",
  "assistant_coach",
  "exco",
]);
export const excoPositionEnum = pgEnum("exco_position", [
  "president",
  "vice_president",
  "general_secretary",
  "treasurer",
  "welfare_officer",
]);
export const leaveReasonEnum = pgEnum("leave_reason", [
  "injury",
  "illness",
  "academics",
  "travel",
  "personal",
]);
export const leaveStatusEnum = pgEnum("leave_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);
export const insightCategoryEnum = pgEnum("insight_category", [
  "training",
  "competition",
  "club_news",
  "wellness",
]);
// A grading stays "scheduled" while candidates are being entered, moves to
// "in_progress" once the panel starts marking, and only promotes anyone when a
// coach publishes it. Results are deliberately not visible to candidates before
// that, so a panel can revise a mark without a member having already seen it.
export const gradingStatusEnum = pgEnum("grading_status", [
  "scheduled",
  "in_progress",
  "published",
  "cancelled",
]);
// "pending" until the panel finishes marking; "absent" and "withdrawn" are
// administrative and carry no scores.
export const gradingOutcomeEnum = pgEnum("grading_outcome", [
  "pending",
  "distinction",
  "pass",
  "fail",
  "absent",
  "withdrawn",
]);
// A member's self-nomination to be entered for a grading, made while a window
// is open. "pending" until a coach reviews it; "accepted" links to the
// grading_candidates row it produced; "declined" carries the coach's reason.
export const gradingRequestStatusEnum = pgEnum("grading_request_status", [
  "pending",
  "accepted",
  "declined",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 50 }).unique(),
  passwordHash: text("password_hash"),
  role: roleEnum("role").notNull().default("student"),
  // Only meaningful when `role` is "exco": which executive office the member
  // holds. Drives what the exco dashboard shows and what they may change.
  excoPosition: excoPositionEnum("exco_position"),
  status: userStatusEnum("status").notNull().default("active"),
  // Password reset. The club has no outbound email, so a reset is mediated by
  // the General Secretary: the member raises a request (resetRequestedAt), the
  // Secretary verifies who they are and issues a link (resetToken), and hands
  // it over directly.
  resetRequestedAt: timestamp("reset_requested_at", { withTimezone: true }),
  resetToken: varchar("reset_token", { length: 255 }).unique(),
  resetTokenExpires: timestamp("reset_token_expires", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberProfiles = pgTable("member_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  membershipCategory: membershipCategoryEnum("membership_category").notNull(),
  matricOrStaffNo: varchar("matric_or_staff_no", { length: 100 }),
  department: varchar("department", { length: 150 }),
  faculty: varchar("faculty", { length: 150 }),
  levelYear: varchar("level_year", { length: 20 }),
  gender: varchar("gender", { length: 20 }),
  dob: date("dob"),
  phone: varchar("phone", { length: 30 }),
  address: text("address"),
  beltGrade: varchar("belt_grade", { length: 50 }),
  // When the member reached their current belt. Written by the grading panel on
  // promotion, and the basis of the time-in-grade requirement for the next one.
  // Null for members who have never graded here - their join date stands in.
  rankAttainedAt: date("rank_attained_at"),
  affiliatedClub: varchar("affiliated_club", { length: 150 }),
  assignedSubCommitteeId: uuid("assigned_sub_committee_id").references(
    () => subCommittees.id,
    { onDelete: "set null" }
  ),
  avatarUrl: text("avatar_url"),
});

export const medicalRecords = pgTable("medical_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  bloodGroup: varchar("blood_group", { length: 10 }),
  genotype: varchar("genotype", { length: 10 }),
  allergies: text("allergies"),
  chronicConditions: text("chronic_conditions"),
  recentInjuries: text("recent_injuries"),
  emergencyContactName: varchar("emergency_contact_name", { length: 150 }),
  emergencyContactRelationship: varchar("emergency_contact_relationship", {
    length: 100,
  }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 30 }),
  altPhone: varchar("alt_phone", { length: 30 }),
});

export const subCommittees = pgTable("sub_committees", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
});

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),

  // 1. Membership category
  membershipCategory: membershipCategoryEnum("membership_category").notNull(),

  // Passport photograph (white background), stored as a base64 data URL
  photoData: text("photo_data"),

  // 2. Personal & academic profile
  fullName: varchar("full_name", { length: 255 }).notNull(),
  matricOrStaffNo: varchar("matric_or_staff_no", { length: 100 }),
  utmeJambNo: varchar("utme_jamb_no", { length: 50 }),
  department: varchar("department", { length: 150 }).notNull(),
  faculty: varchar("faculty", { length: 150 }).notNull(),
  levelYear: varchar("level_year", { length: 20 }),
  gender: varchar("gender", { length: 20 }).notNull(),
  dob: date("dob").notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  address: text("address").notNull(),

  // 3. Medical history & safety disclosures
  bloodGroup: varchar("blood_group", { length: 10 }),
  genotype: varchar("genotype", { length: 10 }),
  allergies: text("allergies"),
  chronicConditions: text("chronic_conditions"),
  recentInjuries: text("recent_injuries"),
  emergencyContactName: varchar("emergency_contact_name", { length: 150 }).notNull(),
  emergencyContactRelationship: varchar("emergency_contact_relationship", {
    length: 100,
  }).notNull(),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 30 }).notNull(),
  altPhone: varchar("alt_phone", { length: 30 }),

  // 4. Martial arts experience & structural commitments
  priorTraining: boolean("prior_training").notNull().default(false),
  beltGrade: varchar("belt_grade", { length: 50 }),
  affiliatedClub: varchar("affiliated_club", { length: 150 }),
  subCommitteePref1Id: uuid("sub_committee_pref_1_id").references(() => subCommittees.id),
  subCommitteePref2Id: uuid("sub_committee_pref_2_id").references(() => subCommittees.id),
  subCommitteePref3Id: uuid("sub_committee_pref_3_id").references(() => subCommittees.id),

  // 5. Statement of purpose
  statementOfPurpose: text("statement_of_purpose").notNull(),

  // 6. Waiver (UTC-W01) acknowledgements
  waiverRiskAck: boolean("waiver_risk_ack").notNull().default(false),
  waiverReleaseAck: boolean("waiver_release_ack").notNull().default(false),
  waiverMedicalAck: boolean("waiver_medical_ack").notNull().default(false),
  waiverMediaConsent: boolean("waiver_media_consent").notNull().default(false),
  waiverSignatureName: varchar("waiver_signature_name", { length: 255 }).notNull(),
  waiverSignatureDate: date("waiver_signature_date").notNull(),
  guardianName: varchar("guardian_name", { length: 255 }),
  guardianSignature: varchar("guardian_signature", { length: 255 }),

  // Review pipeline
  status: applicationStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  setupToken: varchar("setup_token", { length: 255 }).unique(),
  setupTokenExpires: timestamp("setup_token_expires", { withTimezone: true }),
  userId: uuid("user_id").references(() => users.id),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trainingSessions = pgTable("training_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  date: date("date").notNull(),
  startTime: varchar("start_time", { length: 10 }),
  endTime: varchar("end_time", { length: 10 }),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => trainingSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  present: boolean("present").notNull().default(true),
  markedBy: uuid("marked_by").references(() => users.id),
  markedAt: timestamp("marked_at", { withTimezone: true }).notNull().defaultNow(),
});

// The club runs grading in periods rather than continuously. A coach opens a
// window as a grading approaches; it lapses on its own at `closesAt`, or a
// coach closes it early. While none is open the grading system is dormant.
// `gradingWindowState` in `@/lib/grading` turns a row into its current phase.
export const gradingWindows = pgTable("grading_windows", {
  id: uuid("id").primaryKey().defaultRandom(),
  opensAt: date("opens_at").notNull(),
  closesAt: date("closes_at").notNull(),
  // Shown to members while the window is open: what is being graded, what to
  // bring, where to be.
  note: text("note"),
  openedBy: uuid("opened_by").references(() => users.id),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  // Set only when a coach closes the window ahead of `closesAt`.
  closedBy: uuid("closed_by").references(() => users.id),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

// A belt grading (promotion test) run by the coaching panel. The rules that
// govern eligibility, scoring and promotion live in `@/lib/grading`.
export const gradingEvents = pgTable("grading_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  date: date("date").notNull(),
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  status: gradingStatusEnum("status").notNull().default("scheduled"),

  // What a candidate pays to sit this grading, set by the coaching panel.
  // Null means no fee has been assigned yet - candidates are not billed until
  // a coach sets one. Entering a candidate on a grading that has a fee raises
  // a `dues` row for them, so grading money runs through the same claim and
  // confirmation flow as everything else.
  fee: numeric("fee", { precision: 10, scale: 2 }),

  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  publishedBy: uuid("published_by").references(() => users.id),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

// One member entered for one grading, with the panel's marks.
export const gradingCandidates = pgTable(
  "grading_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gradingId: uuid("grading_id")
      .notNull()
      .references(() => gradingEvents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // The candidate's rank going in, snapshotted when they are entered. Stored
    // rather than recomputed so a published record still reads correctly after
    // the member's profile moves on.
    fromRank: varchar("from_rank", { length: 30 }).notNull(),

    // The belt being graded to ("yellow", "blue", ...). A grading moves a
    // member by belt; whether it is a single or a double follows from the
    // distance between `fromRank`'s belt and this one.
    toBelt: varchar("to_belt", { length: 20 }).notNull(),

    // The geup the panel actually awarded inside `toBelt`, chosen at marking
    // from how the candidate performed. Null until marked, and null for anyone
    // who did not pass - there is no grade to record.
    awardedRank: varchar("awarded_rank", { length: 30 }),

    // Panel marks, 0-10 each, null until examined. Which of these are examined
    // depends on the target belt's band - see `criteriaFor` in `@/lib/grading`.
    scoreBasics: integer("score_basics"),
    scorePoomsae: integer("score_poomsae"),
    scoreKyorugi: integer("score_kyorugi"),
    scoreKyukpa: integer("score_kyukpa"),
    scoreHoshinsul: integer("score_hoshinsul"),
    scoreTheory: integer("score_theory"),

    // Weighted total out of 100 and the decision it produced. Both are derived
    // from the marks above, and are recomputed server-side on every save rather
    // than trusted from the client.
    totalScore: numeric("total_score", { precision: 5, scale: 2 }),
    outcome: gradingOutcomeEnum("outcome").notNull().default("pending"),
    examinerNotes: text("examiner_notes"),

    // A coach may enter a candidate who fails an eligibility gate, but only on
    // the record - the reason is required and shown alongside the result.
    eligibilityOverrideReason: text("eligibility_override_reason"),

    examinedBy: uuid("examined_by").references(() => users.id),
    examinedAt: timestamp("examined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("grading_candidates_grading_user_unique").on(t.gradingId, t.userId)]
);

// A student's self-nomination for grading, made while a grading window is
// open. A coach accepts (which enters them into a specific grading event as a
// grading_candidates row) or declines it.
export const gradingRequests = pgTable("grading_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // The belt the student is asking to grade to ("yellow", "blue", ...).
  targetBeltId: varchar("target_belt_id", { length: 20 }).notNull(),
  note: text("note"),
  status: gradingRequestStatusEnum("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  // Set once accepted: the grading_candidates row this request became.
  gradingCandidateId: uuid("grading_candidate_id").references(
    () => gradingCandidates.id,
    { onDelete: "set null" }
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dues = pgTable("dues", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  periodLabel: varchar("period_label", { length: 100 }).notNull(),

  // Set when this charge is a grading fee rather than a membership due, so the
  // grading pages can show payment state per candidate. Kept on delete so a
  // settled payment survives the grading record being removed.
  gradingId: uuid("grading_id").references(() => gradingEvents.id, {
    onDelete: "set null",
  }),

  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  receiptNo: varchar("receipt_no", { length: 100 }),
  recordedBy: uuid("recorded_by").references(() => users.id),
  paymentClaimed: boolean("payment_claimed").notNull().default(false),
  paymentClaimedAt: timestamp("payment_claimed_at", { withTimezone: true }),
  paymentReference: varchar("payment_reference", { length: 150 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  athleteName: varchar("athlete_name", { length: 255 }).notNull(),
  matricNo: varchar("matric_no", { length: 100 }),
  sex: varchar("sex", { length: 20 }),
  course: varchar("course", { length: 150 }),
  level: varchar("level", { length: 20 }),
  medal: medalEnum("medal").notNull(),
  competitionName: varchar("competition_name", { length: 255 }).notNull(),
  competitionDate: date("competition_date").notNull(),
  venue: varchar("venue", { length: 255 }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const galleryItems = pgTable("gallery_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  imageUrl: text("image_url").notNull(),
  caption: varchar("caption", { length: 255 }),
  category: galleryCategoryEnum("category").notNull().default("training"),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  audience: announcementAudienceEnum("audience").notNull().default("all"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leadership = pgTable("leadership", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  title: varchar("title", { length: 150 }).notNull(),
  category: leadershipCategoryEnum("category").notNull(),
  subCommitteeId: uuid("sub_committee_id").references(() => subCommittees.id),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  displayOrder: integer("display_order").notNull().default(0),
});

export const insights = pgTable("insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),
  coverImageUrl: text("cover_image_url"),
  category: insightCategoryEnum("category").notNull().default("club_news"),
  authorName: varchar("author_name", { length: 150 }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 150 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Members request to be excused from training for a period; the Welfare
// Officer (or the President) approves or declines it.
export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reasonCategory: leaveReasonEnum("reason_category").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  details: text("details").notNull(),
  status: leaveStatusEnum("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  user: one(users, { fields: [leaveRequests.userId], references: [users.id] }),
  reviewer: one(users, { fields: [leaveRequests.reviewedBy], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(memberProfiles, {
    fields: [users.id],
    references: [memberProfiles.userId],
  }),
  medicalRecord: one(medicalRecords, {
    fields: [users.id],
    references: [medicalRecords.userId],
  }),
  attendance: many(attendance),
  dues: many(dues),
  leaveRequests: many(leaveRequests),
}));

export const memberProfilesRelations = relations(memberProfiles, ({ one }) => ({
  user: one(users, { fields: [memberProfiles.userId], references: [users.id] }),
  assignedSubCommittee: one(subCommittees, {
    fields: [memberProfiles.assignedSubCommitteeId],
    references: [subCommittees.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  reviewer: one(users, { fields: [applications.reviewedBy], references: [users.id] }),
  activatedUser: one(users, { fields: [applications.userId], references: [users.id] }),
  subCommitteePref1: one(subCommittees, {
    fields: [applications.subCommitteePref1Id],
    references: [subCommittees.id],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  session: one(trainingSessions, {
    fields: [attendance.sessionId],
    references: [trainingSessions.id],
  }),
  user: one(users, { fields: [attendance.userId], references: [users.id] }),
}));

export const trainingSessionsRelations = relations(trainingSessions, ({ many }) => ({
  attendance: many(attendance),
}));

export const gradingEventsRelations = relations(gradingEvents, ({ one, many }) => ({
  candidates: many(gradingCandidates),
  creator: one(users, { fields: [gradingEvents.createdBy], references: [users.id] }),
  publisher: one(users, { fields: [gradingEvents.publishedBy], references: [users.id] }),
}));

export const gradingCandidatesRelations = relations(gradingCandidates, ({ one }) => ({
  grading: one(gradingEvents, {
    fields: [gradingCandidates.gradingId],
    references: [gradingEvents.id],
  }),
  user: one(users, { fields: [gradingCandidates.userId], references: [users.id] }),
  examiner: one(users, { fields: [gradingCandidates.examinedBy], references: [users.id] }),
}));

export const gradingRequestsRelations = relations(gradingRequests, ({ one }) => ({
  user: one(users, { fields: [gradingRequests.userId], references: [users.id] }),
  reviewer: one(users, { fields: [gradingRequests.reviewedBy], references: [users.id] }),
  candidate: one(gradingCandidates, {
    fields: [gradingRequests.gradingCandidateId],
    references: [gradingCandidates.id],
  }),
}));
