/**
 * Seeds clearly-fictional demo data so every dashboard has something to show
 * on first login. No real club MEMBER data (names, matric numbers, contact
 * info, medical info) is used anywhere in this file. See plan notes on PII.
 *
 * Two exceptions carry real (non-member-PII) content:
 *  - The Insights posts are adapted from the club's own real internal memos
 *    (grading-day protocol, the 2026 competition calendar, membership
 *    reactivation policy), attributed generically to the issuing office
 *    rather than the individual student officer who signed the original
 *    memo. The Head Coach's name is the one individual name reused here,
 *    matching the leadership section above, which already treats it as
 *    public/institutional.
 *  - The achievements are real 2026 season results adapted from the club's
 *    sponsorship prospectus, aggregated by medal tier per tournament rather
 *    than attributed to named athletes, since that source has no per-athlete
 *    breakdown and no individual student's name should be hardcoded here.
 *
 * Run with: npm run db:seed
 */
import { hash } from "bcryptjs";
import { db } from "./index";
import {
  users,
  memberProfiles,
  medicalRecords,
  subCommittees,
  leadership,
  trainingSessions,
  attendance,
  dues,
  leaveRequests,
  achievements,
  galleryItems,
  announcements,
  applications,
  insights,
} from "./schema";
import { eq } from "drizzle-orm";

const DEMO_PASSWORD = "Demo1234!";

function placeholderImage(seed: string) {
  return `https://picsum.photos/seed/${seed}/800/600`;
}

// One demo account per executive office, so each role-scoped view of the exco
// dashboard can be logged into and checked.
const DEMO_EXCO_OFFICERS = [
  {
    position: "president",
    email: "exco@demo.unilagtkd.example",
    fullName: "Exco Demo President",
    matricOrStaffNo: "TKD/00/0001",
    levelYear: "400",
    committee: "Administrative & Media",
  },
  {
    position: "vice_president",
    email: "vp@demo.unilagtkd.example",
    fullName: "Exco Demo Vice President",
    matricOrStaffNo: "TKD/00/0002",
    levelYear: "400",
    committee: "Logistics & Operations",
  },
  {
    position: "general_secretary",
    email: "secretary@demo.unilagtkd.example",
    fullName: "Exco Demo Secretary",
    matricOrStaffNo: "TKD/00/0003",
    levelYear: "300",
    committee: "Administrative & Media",
  },
  {
    position: "treasurer",
    email: "treasurer@demo.unilagtkd.example",
    fullName: "Exco Demo Treasurer",
    matricOrStaffNo: "TKD/00/0004",
    levelYear: "300",
    committee: "Administrative & Media",
  },
  {
    position: "welfare_officer",
    email: "welfare@demo.unilagtkd.example",
    fullName: "Exco Demo Welfare Officer",
    matricOrStaffNo: "TKD/00/0005",
    levelYear: "200",
    committee: "Welfare & Medical Safety",
  },
] as const;

type ExcoOfficerPosition = (typeof DEMO_EXCO_OFFICERS)[number]["position"];

/**
 * Creates (or repairs) the demo exco accounts. Written to be re-runnable so a
 * database seeded before the offices existed can be topped up in place.
 */
async function ensureExcoOfficers(passwordHash: string) {
  const committees = await db
    .select({ id: subCommittees.id, name: subCommittees.name })
    .from(subCommittees);

  const officers = {} as Record<ExcoOfficerPosition, { id: string }>;

  for (const officer of DEMO_EXCO_OFFICERS) {
    const committeeId = committees.find((c) => c.name === officer.committee)?.id ?? null;

    const [existing] = await db
      .select({ id: users.id, excoPosition: users.excoPosition })
      .from(users)
      .where(eq(users.email, officer.email))
      .limit(1);

    if (existing) {
      if (existing.excoPosition !== officer.position) {
        await db
          .update(users)
          .set({ role: "exco", excoPosition: officer.position })
          .where(eq(users.id, existing.id));
        console.log(`  updated ${officer.email} -> ${officer.position}`);
      }
      officers[officer.position] = existing;
      continue;
    }

    const [created] = await db
      .insert(users)
      .values({
        email: officer.email,
        passwordHash,
        role: "exco",
        excoPosition: officer.position,
      })
      .returning({ id: users.id });

    await db.insert(memberProfiles).values({
      userId: created.id,
      fullName: officer.fullName,
      membershipCategory: "undergraduate",
      matricOrStaffNo: officer.matricOrStaffNo,
      department: "Demo Department",
      faculty: "Demo Faculty",
      levelYear: officer.levelYear,
      assignedSubCommitteeId: committeeId,
    });

    console.log(`  created ${officer.email} (${officer.position})`);
    officers[officer.position] = created;
  }

  return officers;
}

async function main() {
  const [existingStudent] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "student@demo.unilagtkd.example"))
    .limit(1);

  if (existingStudent) {
    console.log("Demo data already present (student@demo.unilagtkd.example exists), skipping seed.");
    console.log("Checking the per-office exco demo accounts...");
    await ensureExcoOfficers(await hash(DEMO_PASSWORD, 10));
    return;
  }

  console.log("Seeding sub-committees...");
  const subCommitteeRows = await db
    .insert(subCommittees)
    .values([
      {
        name: "Administrative & Media",
        description: "Handles club communications, record-keeping, and media/publicity.",
      },
      {
        name: "Logistics & Operations",
        description: "Handles equipment, venue coordination, and event logistics.",
      },
      {
        name: "Welfare & Medical Safety",
        description: "Handles member welfare, first aid readiness, and medical safety.",
      },
    ])
    .returning({ id: subCommittees.id, name: subCommittees.name });

  const adminMediaCommittee = subCommitteeRows.find((c) => c.name === "Administrative & Media")!;
  const logisticsCommittee = subCommitteeRows.find((c) => c.name === "Logistics & Operations")!;
  const welfareCommittee = subCommitteeRows.find((c) => c.name === "Welfare & Medical Safety")!;

  console.log("Seeding leadership...");
  await db.insert(leadership).values([
    // Real, publicly-attributed info from the club's Official Club Manual
    // (2026 Issue), which names the Head Coach as its approving authority.
    {
      name: "G.M. Adebola Otubushin",
      title: "Grandmaster / Head Coach",
      category: "head_coach",
      bio: "8th Dan Jidokwan, 4th Dan Kukkiwon Black Belt. Designs the training syllabus, oversees athlete grading, and holds final approval over varsity team selection.",
      displayOrder: 1,
    },
    // Assistant Coach / Exco names below are fictional placeholders,
    // no individuals were named for these roles in the source material.
    {
      name: "Coach B. Sample",
      title: "Assistant Coach / Instructor",
      category: "assistant_coach",
      bio: "Placeholder bio, replace via the admin dashboard.",
      photoUrl: placeholderImage("assistant-coach-1"),
      displayOrder: 2,
    },
    {
      name: "Coach C. Example",
      title: "Assistant Coach / Instructor",
      category: "assistant_coach",
      bio: "Placeholder bio, replace via the admin dashboard.",
      photoUrl: placeholderImage("assistant-coach-2"),
      displayOrder: 3,
    },
    {
      name: "Demo President",
      title: "Club President / Captain",
      category: "exco",
      bio: "Administrative head and executive leader of the club; represents the club at the UNILAG Sports Council.",
      displayOrder: 4,
    },
    {
      name: "Demo Vice President (Administrative)",
      title: "Vice President / Deputy Captain",
      category: "exco",
      bio: "Assists the President and leads the Administrative Committee.",
      subCommitteeId: adminMediaCommittee.id,
      displayOrder: 5,
    },
    {
      name: "Demo Vice President (Logistics)",
      title: "Vice President / Deputy Captain",
      category: "exco",
      bio: "Assists the President and leads the Logistics Committee.",
      subCommitteeId: logisticsCommittee.id,
      displayOrder: 6,
    },
    {
      name: "Demo Secretary",
      title: "General Secretary",
      category: "exco",
      bio: "Custodian of club records and communication; co-leads the Administrative Committee.",
      subCommitteeId: adminMediaCommittee.id,
      displayOrder: 7,
    },
    {
      name: "Demo Treasurer",
      title: "Treasurer",
      category: "exco",
      bio: "Manages dues collection and financial ledgers; co-leads the Administrative Committee.",
      subCommitteeId: adminMediaCommittee.id,
      displayOrder: 8,
    },
    {
      name: "Demo Welfare Officer",
      title: "Welfare Officer",
      category: "exco",
      bio: "Leads the Welfare Committee: first-aid logistics, medical support, and athlete wellbeing.",
      subCommitteeId: welfareCommittee.id,
      displayOrder: 9,
    },
  ]);

  console.log("Seeding demo users (one per role)...");
  const passwordHash = await hash(DEMO_PASSWORD, 10);

  const [studentUser] = await db
    .insert(users)
    .values({
      email: "student@demo.unilagtkd.example",
      passwordHash,
      role: "student",
    })
    .returning();

  const [coachUser] = await db
    .insert(users)
    .values({
      email: "coach@demo.unilagtkd.example",
      passwordHash,
      role: "coach",
    })
    .returning();

  const officers = await ensureExcoOfficers(passwordHash);
  const excoUser = officers.president;
  const welfareUser = officers.welfare_officer;
  const secretaryUser = officers.general_secretary;

  const [alumniUser] = await db
    .insert(users)
    .values({
      email: "alumni@demo.unilagtkd.example",
      passwordHash,
      role: "alumni",
    })
    .returning();

  console.log("Seeding member profile + medical record for the demo student...");
  await db.insert(memberProfiles).values({
    userId: studentUser.id,
    fullName: "Jane Athlete",
    membershipCategory: "undergraduate",
    matricOrStaffNo: "TKD/00/0000",
    department: "Demo Department",
    faculty: "Demo Faculty",
    levelYear: "300",
    gender: "Female",
    dob: "2003-01-15",
    phone: "0000000000",
    address: "Demo address, Lagos",
    beltGrade: "Yellow Belt 8th Geup",
    assignedSubCommitteeId: welfareCommittee.id,
  });

  await db.insert(medicalRecords).values({
    userId: studentUser.id,
    bloodGroup: "O+",
    genotype: "AA",
    allergies: "None",
    chronicConditions: "None",
    recentInjuries: "None",
    emergencyContactName: "Demo Emergency Contact",
    emergencyContactRelationship: "Guardian",
    emergencyContactPhone: "0000000001",
  });

  await db.insert(memberProfiles).values({
    userId: coachUser.id,
    fullName: "Coach Sample Instructor",
    membershipCategory: "non_student",
    beltGrade: "Black Belt 3rd Dan",
  });

  await db.insert(memberProfiles).values({
    userId: alumniUser.id,
    fullName: "Alex Alumnus",
    membershipCategory: "alumni",
    matricOrStaffNo: "TKD/00/0006",
    department: "Demo Department",
    faculty: "Demo Faculty",
    beltGrade: "Red Belt 1st Geup",
  });

  console.log("Seeding training sessions + attendance...");
  const [session1] = await db
    .insert(trainingSessions)
    .values({
      title: "General Training",
      date: "2026-08-15",
      startTime: "16:00",
      endTime: "18:00",
      location: "Indoor",
      description: "Regular weekly training session (placeholder schedule).",
      createdBy: coachUser.id,
    })
    .returning();

  const [session2] = await db
    .insert(trainingSessions)
    .values({
      title: "Sparring & Conditioning",
      date: "2026-08-18",
      startTime: "16:00",
      endTime: "18:00",
      location: "Track",
      description: "Sparring drills and conditioning (placeholder schedule).",
      createdBy: coachUser.id,
    })
    .returning();

  await db.insert(attendance).values([
    { sessionId: session1.id, userId: studentUser.id, present: true, markedBy: coachUser.id },
    { sessionId: session2.id, userId: studentUser.id, present: false, markedBy: coachUser.id },
  ]);

  console.log("Seeding dues...");
  await db.insert(dues).values([
    {
      userId: studentUser.id,
      periodLabel: "2026 Reactivation",
      amount: "3000.00",
      paid: true,
      paidAt: new Date("2026-05-02"),
      receiptNo: "UTC-R-DEMO-0001",
      recordedBy: excoUser.id,
    },
  ]);

  console.log("Seeding leave requests...");
  await db.insert(leaveRequests).values([
    {
      userId: studentUser.id,
      reasonCategory: "injury",
      startDate: "2026-08-24",
      endDate: "2026-09-07",
      details: "Ankle sprain from the last kyorugi session; physio advises two weeks off.",
    },
    {
      userId: alumniUser.id,
      reasonCategory: "travel",
      startDate: "2026-07-01",
      endDate: "2026-07-14",
      details: "Out of Lagos for work.",
      status: "approved",
      reviewedBy: welfareUser.id,
      reviewedAt: new Date("2026-06-28"),
      reviewNotes: "Approved. Log your return with the Welfare Officer.",
    },
  ]);

  console.log("Seeding achievements (real 2026 season results, one row per medal)...");
  // Real tournament results for the current season, adapted from the club's
  // own sponsorship prospectus and confirmed against its DSA accommodation
  // request letter. Neither source names individual medal-winners, so every
  // row is attributed to a generic "UNILAG TKD Athlete" rather than a real
  // student's name - but the row COUNT is real: one row per medal actually
  // won, so the tally on the site matches the club's claimed 6 Gold / 7
  // Silver / 9 Bronze (22 total) exactly.
  const seasonResults: {
    medal: "gold" | "silver" | "bronze";
    count: number;
    competitionName: string;
    competitionDate: string;
    venue: string;
  }[] = [
    {
      medal: "gold",
      count: 5,
      competitionName: "4th U-20 Tolubabami Taekwondo Championship",
      competitionDate: "2026-05-09",
      venue: "National Stadium, Surulere, Lagos",
    },
    {
      medal: "silver",
      count: 6,
      competitionName: "4th U-20 Tolubabami Taekwondo Championship",
      competitionDate: "2026-05-09",
      venue: "National Stadium, Surulere, Lagos",
    },
    {
      medal: "bronze",
      count: 3,
      competitionName: "4th U-20 Tolubabami Taekwondo Championship",
      competitionDate: "2026-05-09",
      venue: "National Stadium, Surulere, Lagos",
    },
    {
      medal: "gold",
      count: 1,
      competitionName: "Jibadex U-21 Taekwondo Open",
      competitionDate: "2026-02-14",
      venue: "Ikorodu, Lagos",
    },
    {
      medal: "bronze",
      count: 3,
      competitionName: "Jibadex U-21 Taekwondo Open",
      competitionDate: "2026-02-14",
      venue: "Ikorodu, Lagos",
    },
    {
      medal: "bronze",
      count: 3,
      competitionName: "National Taekwondo Senior Open Trials (Ogun State)",
      competitionDate: "2026-05-13",
      venue: "Abeokuta, Ogun State",
    },
    {
      medal: "silver",
      count: 1,
      competitionName: "Master Kenny Taekwondo Open",
      competitionDate: "2026-04-11",
      venue: "Surulere, Lagos",
    },
  ];

  await db.insert(achievements).values(
    seasonResults.flatMap((result) =>
      Array.from({ length: result.count }, () => ({
        athleteName: "UNILAG TKD Athlete",
        medal: result.medal,
        competitionName: result.competitionName,
        competitionDate: result.competitionDate,
        venue: result.venue,
        createdBy: secretaryUser.id,
      }))
    )
  );

  console.log("Seeding gallery items (placeholder images)...");
  await db.insert(galleryItems).values([
    { imageUrl: placeholderImage("training-1"), caption: "Weekly training session (placeholder)", category: "training", uploadedBy: secretaryUser.id },
    { imageUrl: placeholderImage("training-2"), caption: "Sparring drills (placeholder)", category: "training", uploadedBy: secretaryUser.id },
    { imageUrl: placeholderImage("demo-1"), caption: "Public demonstration (placeholder)", category: "demo", uploadedBy: secretaryUser.id },
    { imageUrl: placeholderImage("tournament-1"), caption: "Tournament day (placeholder)", category: "tournament", uploadedBy: secretaryUser.id },
  ]);

  console.log("Seeding announcements...");
  await db.insert(announcements).values([
    {
      title: "Welcome to the new club portal",
      body: "This is a placeholder announcement. Exco and admin can post real announcements from their dashboards.",
      audience: "all",
      createdBy: excoUser.id,
    },
    {
      title: "Coaches: submit attendance weekly",
      body: "Placeholder reminder for coaches to keep attendance records up to date.",
      audience: "coaches",
      createdBy: excoUser.id,
    },
  ]);

  console.log("Seeding one pending membership application (fictional applicant)...");
  await db.insert(applications).values({
    membershipCategory: "undergraduate",
    fullName: "Sample Applicant",
    matricOrStaffNo: "TKD/00/0005",
    department: "Demo Department",
    faculty: "Demo Faculty",
    levelYear: "200",
    gender: "Male",
    dob: "2004-06-20",
    phone: "0000000002",
    email: "applicant@demo.unilagtkd.example",
    address: "Demo address, Lagos",
    bloodGroup: "A+",
    genotype: "AA",
    allergies: "None",
    chronicConditions: "None",
    recentInjuries: "None",
    emergencyContactName: "Demo Applicant Emergency Contact",
    emergencyContactRelationship: "Parent",
    emergencyContactPhone: "0000000003",
    priorTraining: false,
    subCommitteePref1Id: logisticsCommittee.id,
    subCommitteePref2Id: adminMediaCommittee.id,
    subCommitteePref3Id: welfareCommittee.id,
    statementOfPurpose: "Placeholder statement of purpose for demo/testing.",
    waiverRiskAck: true,
    waiverReleaseAck: true,
    waiverMedicalAck: true,
    waiverMediaConsent: true,
    waiverSignatureName: "Sample Applicant",
    waiverSignatureDate: "2026-08-20",
    status: "pending",
  });

  console.log("Seeding insights/blog posts...");
  await db.insert(insights).values([
    {
      title: "Grading Day: Dress Code & Dojang Protocol",
      slug: "grading-day-dress-code-and-dojang-protocol",
      excerpt: "What every member needs to know before stepping onto the mat on grading day.",
      body: "Ahead of every grading, all club members are expected to:\n\n- Arrive early and register their attendance before the day begins.\n- Be properly dressed: trimmed fingernails and toenails, and a clean, pressed Dobok.\n- Double-check that their name is spelt correctly as it should appear on their grading certificate.\n\nThe Dojang mat is configured before 9am on grading day: a 12x8 grading floor and a 7x6 test area.\n\nTrain hard, stay disciplined, and come prepared.",
      coverImageUrl: placeholderImage("insight-grading"),
      category: "training",
      authorName: "G.M. Adebola Otubushin, Head Coach",
      createdBy: secretaryUser.id,
    },
    {
      title: "2026 Competition Calendar",
      slug: "2026-competition-calendar",
      excerpt: "The confirmed and prospective events the squad is preparing for this season.",
      body: "The team is preparing for a full slate of events across the rest of the season, including the Lagos National Taekwondo Classics (Teslim Balogun Stadium, Surulere), the Korean Ambassadors Cup, the Stella Maris Taekwondo Championship (National Stadium, Surulere), and the NUGA Games at the University of Calabar.\n\nSquad selection for the collegiate events follows the process set out in the Club Manual: an attendance cycle, a fitness and conditioning test, a weight check, in-house trials, and continuous technical assessment during training and sparring. Selection for the non-collegiate events (Lagos Classics, KAC, Stella Maris) is open to any member who shows the commitment and preparedness required.\n\nDetermination, consistency, and hard work in training will decide who makes the squad.",
      coverImageUrl: placeholderImage("insight-competition"),
      category: "competition",
      authorName: "Coaching Team",
      createdBy: secretaryUser.id,
    },
    {
      title: "Membership Reactivation for the New Season",
      slug: "membership-reactivation-for-the-new-season",
      excerpt: "What's required to reactivate your membership as the club resumes full activities.",
      body: "As the club resumes full activities, every member is asked to reactivate their membership both financially and morally.\n\nFinancially, members are asked for a mandatory contribution of at least ₦3,000 toward the procurement and upkeep of training equipment. Morally, reactivation means regular attendance, discipline and good conduct, and following through on assigned responsibilities.\n\nAll members, whether current students, alumni, or non-students, get access to the membership portal to track attendance and participation. Portal access follows completion of the financial contribution.\n\nYour cooperation keeps the club running and helps us build a stronger, more competitive team.",
      category: "club_news",
      authorName: "Executive Committee",
      createdBy: secretaryUser.id,
    },
  ]);

  console.log("\nDone. Demo login credentials (all fictional accounts):");
  console.log("  student@demo.unilagtkd.example / " + DEMO_PASSWORD);
  console.log("  coach@demo.unilagtkd.example   / " + DEMO_PASSWORD);
  console.log("  exco@demo.unilagtkd.example    / " + DEMO_PASSWORD + "  (president)");
  console.log("  vp@demo.unilagtkd.example      / " + DEMO_PASSWORD + "  (vice president)");
  console.log("  secretary@demo.unilagtkd.example / " + DEMO_PASSWORD + "  (general secretary)");
  console.log("  treasurer@demo.unilagtkd.example / " + DEMO_PASSWORD + "  (treasurer)");
  console.log("  welfare@demo.unilagtkd.example / " + DEMO_PASSWORD + "  (welfare officer)");
  console.log("  alumni@demo.unilagtkd.example  / " + DEMO_PASSWORD);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
