import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { applications, dues, memberProfiles, membershipFitness } from "@/db/schema";
import { memberPhotoReference } from "@/lib/member-photo";
import { getSemesterDues } from "@/lib/semester-dues";
import { PrintButton } from "./print-button";

/* Form UTC-A01 (2026), laid out to match the club's printed intake form so a
   member can print it, sign it by hand, and hand it in. Values known to the
   system are filled in; everything else prints as a rule to complete by pen. */

function Box({ checked, label }: { checked?: boolean; label: string }) {
  return (
    <span className="mr-4 inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="inline-flex h-3 w-3 flex-none items-center justify-center border border-zinc-700 text-[9px] leading-none">
        {checked ? "✓" : ""}
      </span>
      <span>{label}</span>
    </span>
  );
}

/** A labelled cell in one of the form's bordered tables. */
function Cell({
  label,
  value,
  hint,
  children,
  wide,
}: {
  label: string;
  value?: string | null;
  hint?: string;
  children?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`flex border-b border-zinc-300 last:border-b-0 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="w-40 flex-none border-r border-zinc-300 bg-zinc-50/60 px-2 py-1.5 text-[11px] font-bold leading-tight text-zinc-800">
        {label}
      </div>
      <div className="min-w-0 flex-1 px-2 py-1.5">
        {children ?? (
          <div className="min-h-[1.1rem] border-b border-dotted border-zinc-400 text-[11px] text-black">
            {value || " "}
          </div>
        )}
        {hint && <div className="mt-0.5 text-center text-[9px] italic text-zinc-500">{hint}</div>}
      </div>
    </div>
  );
}

function SectionHeading({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="mt-5 border-b-2 border-[#1e3a5f] pb-1 text-[13px] font-bold tracking-wide text-[#1e3a5f]">
      {n}. {title}
    </h2>
  );
}

function SignRule({ label }: { label: string }) {
  return (
    <div>
      <div className="mt-6 border-b border-black" />
      <div className="mt-1 text-[10px] text-zinc-700">{label}</div>
    </div>
  );
}

export default async function MembershipFormPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const [[application], [profile], [baselineFitness]] = await Promise.all([
    db.select({
      semesterLabel: applications.semesterLabel,
      paymentStatus: applications.paymentStatus,
      paymentReviewedAt: applications.paymentReviewedAt,
      status: applications.status,
      photoData: memberPhotoReference(applications.photoData, "application"),
      membershipCategory: applications.membershipCategory,
      gender: applications.gender,
      dob: applications.dob,
      fullName: applications.fullName,
      matricOrStaffNo: applications.matricOrStaffNo,
      utmeJambNo: applications.utmeJambNo,
      department: applications.department,
      faculty: applications.faculty,
      levelYear: applications.levelYear,
      phone: applications.phone,
      email: applications.email,
      address: applications.address,
      bloodGroup: applications.bloodGroup,
      genotype: applications.genotype,
      allergies: applications.allergies,
      chronicConditions: applications.chronicConditions,
      recentInjuries: applications.recentInjuries,
      emergencyContactName: applications.emergencyContactName,
      emergencyContactRelationship: applications.emergencyContactRelationship,
      emergencyContactPhone: applications.emergencyContactPhone,
      altPhone: applications.altPhone,
      priorTraining: applications.priorTraining,
      beltGrade: applications.beltGrade,
      affiliatedClub: applications.affiliatedClub,
      statementOfPurpose: applications.statementOfPurpose,
      reviewedAt: applications.reviewedAt,
    }).from(applications).where(eq(applications.userId, session.user.id)).orderBy(desc(applications.createdAt)).limit(1),
    db.select({
      avatarUrl: memberPhotoReference(memberProfiles.avatarUrl, "profile"),
      membershipCategory: memberProfiles.membershipCategory,
      gender: memberProfiles.gender,
      dob: memberProfiles.dob,
      fullName: memberProfiles.fullName,
      matricOrStaffNo: memberProfiles.matricOrStaffNo,
      department: memberProfiles.department,
      faculty: memberProfiles.faculty,
      levelYear: memberProfiles.levelYear,
      phone: memberProfiles.phone,
      address: memberProfiles.address,
      beltGrade: memberProfiles.beltGrade,
      affiliatedClub: memberProfiles.affiliatedClub,
    }).from(memberProfiles).where(eq(memberProfiles.userId, session.user.id)).limit(1),
    db.select().from(membershipFitness).where(eq(membershipFitness.userId, session.user.id)).limit(1),
  ]);

  const a = application;
  const p = profile;
  const semester = a?.semesterLabel ?? (await getSemesterDues()).label;
  const [semesterPayment] = await db.select({ receiptNo: dues.receiptNo, paidAt: dues.paidAt }).from(dues)
    .where(and(
      eq(dues.userId, session.user.id),
      eq(dues.periodLabel, `${semester} semester dues`.slice(0, 100)),
      eq(dues.paid, true),
      isNull(dues.gradingId),
    ))
    .orderBy(desc(dues.paidAt))
    .limit(1);
  const paid = a?.paymentStatus === "confirmed" || Boolean(semesterPayment);
  const paymentConfirmedAt = a?.paymentStatus === "confirmed"
    ? a.paymentReviewedAt ?? semesterPayment?.paidAt
    : semesterPayment?.paidAt;
  const approved = a?.status === "approved";
  const photo = a?.photoData || p?.avatarUrl;
  const category = (a?.membershipCategory ?? p?.membershipCategory ?? "").toLowerCase();
  const gender = (a?.gender ?? p?.gender ?? "").toLowerCase();
  const dob = a?.dob ?? p?.dob ?? null;
  const fmt = (d: unknown) => (d ? new Date(d as string).toLocaleDateString("en-GB") : "");

  return (
    <div className="max-w-4xl">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-brand-black">Membership Form</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Form UTC-A01, pre-filled with what we already hold for you. Print it, complete
          anything blank in block letters, sign it by hand, and return it to the
          Secretariat with your Liability Waiver (UTC-W01).
        </p>
        {!a && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No submitted application found for your account, so most fields are blank.
            You can still print this and complete it by hand.
          </p>
        )}
        <div className="mt-4">
          <PrintButton />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-black/10 bg-white p-8 text-black print:mt-0 print:rounded-none print:border-0 print:p-0">
        {/* Letterhead */}
        <header className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/unilag-logo.png" alt="" className="h-14 w-14 object-contain" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/club-logo.png" alt="" className="h-14 w-14 object-contain" />
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight text-[#1e3a5f]">
              UNILAG TAEKWONDO CLUB
            </div>
            <div className="text-base font-semibold text-[#1e3a5f]">UNIVERSITY OF LAGOS</div>
            <div className="mt-1 text-sm font-bold tracking-wide text-brand-red">
              MEMBERSHIP APPLICATION &amp; INTAKE FORM
            </div>
            <div className="text-xs italic text-zinc-600">(Fill in Block Letters)</div>
          </div>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Applicant’s passport photograph" className="h-32 w-28 flex-none object-contain" />
          ) : (
            <div className="flex h-32 w-28 flex-none items-center justify-center border-2 border-dashed border-[#1e3a5f] p-2 text-center text-[9px] font-bold leading-tight text-[#1e3a5f]">
              AFFIX PASSPORT
              <br />
              PHOTOGRAPH
              <br />
              (WHITE B/G)
            </div>
          )}
        </header>

        <SectionHeading n={1} title="MEMBERSHIP CATEGORY" />
        <div className="mt-2 border border-zinc-300">
          <Cell label="Application Type:">
            <div className="text-[11px] leading-6">
              <Box checked={category.includes("undergrad")} label="Student-Member (Undergraduate)" />
              <Box checked={category.includes("postgrad")} label="Student-Member (Postgraduate)" />
              <br />
              <Box checked={category.includes("alumni")} label="Alumni-Member" />
              <Box checked={category.includes("non-student")} label="Non-Student Member" />
            </div>
          </Cell>
        </div>

        <SectionHeading n={2} title="PERSONAL & ACADEMIC PROFILE" />
        <div className="mt-2 border border-zinc-300">
          <Cell label="Full Name (Surname First):" value={a?.fullName ?? p?.fullName} />
          <div className="grid sm:grid-cols-2">
            <div className="border-r border-zinc-300">
              <Cell label="Matric / Staff Number:" value={a?.matricOrStaffNo ?? p?.matricOrStaffNo} />
            </div>
            <Cell label="UTME / JAMB Reg. No:" value={a?.utmeJambNo} />
            <div className="border-r border-zinc-300">
              <Cell label="Department:" value={a?.department ?? p?.department} />
            </div>
            <Cell label="Faculty / Institution:" value={a?.faculty ?? p?.faculty} />
            <div className="border-r border-zinc-300">
              <Cell label="Current Level / Year:" value={a?.levelYear ?? p?.levelYear} />
            </div>
            <Cell label="Gender / Sex:">
              <div className="text-[11px] leading-6">
                <Box checked={gender.startsWith("m")} label="Male" />
                <Box checked={gender.startsWith("f")} label="Female" />
              </div>
            </Cell>
            <div className="border-r border-zinc-300">
              <Cell label="Date of Birth (DD/MM/YY):" value={fmt(dob)} />
            </div>
            <Cell
              label="Phone Number (WhatsApp/Telegram):"
              value={a?.phone ?? p?.phone}
            />
          </div>
          <Cell label="Email Address:" value={a?.email ?? session.user.email} />
          <Cell label="Residential Address:" value={a?.address ?? p?.address} />
        </div>

        <SectionHeading n={3} title="MEDICAL HISTORY & SAFETY DISCLOSURES" />
        <p className="mt-1 text-[10px] italic leading-relaxed text-zinc-600">
          To preserve student-athlete health on the mats, please declare all historical
          parameters accurately. This ledger is confidential.
        </p>
        <div className="mt-2 border border-zinc-300">
          <div className="grid sm:grid-cols-2">
            <div className="border-r border-zinc-300">
              <Cell label="Blood Group:" value={a?.bloodGroup} />
            </div>
            <Cell label="Genotype:" value={a?.genotype} />
          </div>
          <Cell
            label="Known Food/Drug Allergies:"
            value={a?.allergies}
            hint='Specify "None" if not applicable.'
          />
          <Cell
            label="Chronic Medical Conditions:"
            value={a?.chronicConditions}
            hint="Asthma, cardiovascular anomalies, hypertension, seizures, diabetes, etc."
          />
          <Cell
            label="Recent Bone/Joint Injuries:"
            value={a?.recentInjuries}
            hint="Dislocations, fractures, ligament tears, spinal slips, or recent surgeries."
          />
          <div className="grid sm:grid-cols-2">
            <div className="border-r border-zinc-300">
              <Cell label="Emergency Contact Name:" value={a?.emergencyContactName} />
            </div>
            <Cell label="Relationship to Member:" value={a?.emergencyContactRelationship} />
            <div className="border-r border-zinc-300">
              <Cell label="Emergency Contact Phone:" value={a?.emergencyContactPhone} />
            </div>
            <Cell label="Alternative Phone:" value={a?.altPhone} />
          </div>
        </div>

        {/* Page break: the printed form runs sections 4-6 on sheet two. */}
        <div className="break-before-page" />

        <SectionHeading n={4} title="MARTIAL ARTS EXPERIENCE & STRUCTURAL COMMITMENTS" />
        <div className="mt-2 border border-zinc-300">
          <div className="grid sm:grid-cols-2">
            <div className="border-r border-zinc-300">
              <Cell label="Prior Taekwondo Training?">
                <div className="text-[11px] leading-6">
                  <Box checked={a?.priorTraining === true} label="Yes" />
                  <Box checked={a?.priorTraining === false} label="No" />
                </div>
              </Cell>
            </div>
            <Cell label="Current Belt / Grade Rank:" value={a?.beltGrade ?? p?.beltGrade} />
          </div>
          <Cell label="Affiliated Club/Academy:" value={a?.affiliatedClub ?? p?.affiliatedClub} />
          <Cell label="Mandatory Sub-Committee Preference:">
            <p className="text-[10px] italic leading-relaxed text-zinc-600">
              Per Section 3.3 of the Manual, all active members must serve in one
              sub-structure. Rank preference (1 to 3):
            </p>
            <div className="mt-1 text-[11px] leading-6">
              <Box label="Administrative &amp; Media" />
              <Box label="Logistics &amp; Operations" />
              <br />
              <Box label="Welfare &amp; Medical Safety" />
            </div>
          </Cell>
        </div>

        <SectionHeading n={5} title="SHORT STATEMENT OF PURPOSE (SOP)" />
        <p className="mt-1 text-[10px] italic leading-relaxed text-zinc-600">
          Briefly explain your objective for joining the UNILAG Taekwondo Club and how you
          intend to maintain an optimal balance between intensive full-contact combat
          training and your university academic workload.
        </p>
        <div className="mt-2 min-h-[9rem] border border-zinc-300 p-2 text-[11px] leading-relaxed text-black">
          {a?.statementOfPurpose || " "}
        </div>

        <SectionHeading n={6} title="MEMBER ACKNOWLEDGEMENT & SIGN-OFF" />
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-800">
          By signing below, I certify that all information provided in this registration
          document is true, accurate, and complete. I formally pledge to uphold the five
          tenets of Taekwondo (Courtesy, Integrity, Perseverance, Self-Control, Indomitable
          Spirit), abide by the official Dojang Code of Conduct, observe the structural
          chain of command, and strictly comply with the Disciplinary Policy (Section 8)
          outlined in the club manual. I also confirm that I have filled out and attached
          the statutory Liability Waiver (Form UTC-W01).
        </p>
        <div className="grid gap-x-10 sm:grid-cols-2">
          <SignRule label="Applicant&rsquo;s Signature:" />
          <SignRule label="Date:" />
        </div>

        <div className="mt-8 break-inside-avoid border border-zinc-300 bg-zinc-50/60 p-4">
          <h3 className="border-b border-dashed border-zinc-400 pb-1 text-[11px] font-bold tracking-wide text-[#1e3a5f]">
            OFFICIAL CLUB MANAGEMENT CLEARANCE (INTERNAL USE ONLY)
          </h3>
          <div className="mt-3 grid gap-4 text-[10px] leading-6 text-zinc-800 sm:grid-cols-3">
            <div>
              <div className="font-bold">I. Baseline Fitness Metrics:</div>
              <div>Jumping Jacks (1m): {baselineFitness?.jumpingJacks ?? "______"}</div>
              <div>Push-ups (1m): {baselineFitness?.pushUps ?? "______"}</div>
              <div>Sit-ups (1m): {baselineFitness?.sitUps ?? "______"}</div>
              <div>Burpees (1m): {baselineFitness?.burpees ?? "______"}</div>
              <div className="mt-1">
                Shuttle Status: <Box checked={baselineFitness?.shuttlePassed === true} label="Pass" />
                <Box checked={baselineFitness?.shuttlePassed === false} label="Fail" />
              </div>
              <Box checked={Boolean(baselineFitness)} label="Fitness validated" />
              {baselineFitness && <div>Date: {fmt(baselineFitness.validatedAt)}</div>}
            </div>
            <div className="sm:border-l sm:border-dashed sm:border-zinc-400 sm:pl-4">
              <div className="font-bold">II. Financial Clearance:</div>
              <div className="mt-1">
                Semester Dues: <Box checked={paid} label="Paid" />
                <Box checked={!paid} label="Pending" />
              </div>
              <div>Receipt Number: {semesterPayment?.receiptNo ?? "__________"}</div>
              <div>Treasurer Sig: __________</div>
              <div>Date: {fmt(paymentConfirmedAt) || "____/____/20____"}</div>
            </div>
            <div className="sm:border-l sm:border-dashed sm:border-zinc-400 sm:pl-4">
              <div className="font-bold">III. Final Executive Action:</div>
              <div>Assigned Rank: {p?.beltGrade ?? "__________"}</div>
              <div className="mt-1">
                Status: <Box checked={approved} label="Approved" />
                <Box label="Deferred" />
              </div>
              <div>Head Coach Sign: __________</div>
              <div>Date: {fmt(approved ? a.reviewedAt : null) || "____/____/20____"}</div>
            </div>
          </div>
        </div>

        <footer className="mt-6 flex items-center justify-between border-t border-zinc-300 pt-2 text-[9px] text-zinc-500">
          <span>University of Lagos Taekwondo Club &mdash; Membership Intake</span>
          <span>Form UTC-A01 (2026)</span>
        </footer>
      </div>
    </div>
  );
}
