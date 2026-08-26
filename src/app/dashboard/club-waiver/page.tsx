import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { applications, memberProfiles } from "@/db/schema";
import { PrintButton } from "./print-button";

function InfoRow({
  label,
  value,
  shaded,
}: {
  label: string;
  value?: string | null;
  shaded: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-2 gap-4 border-b border-black/10 px-3 py-2 text-xs ${
        shaded ? "bg-zinc-50" : "bg-white"
      }`}
    >
      <div className="font-semibold text-black">{label}</div>
      <div className="min-h-[1.1rem] border-b border-dotted border-zinc-400 pb-0.5 text-black">
        {value || " "}
      </div>
    </div>
  );
}

function SignatureLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="break-inside-avoid">
      <div className="mt-6 min-h-[1.4rem] border-b border-black pb-0.5 text-sm italic text-black">
        {value || " "}
      </div>
      <div className="mt-1 text-xs text-zinc-700">{label}</div>
    </div>
  );
}

export default async function ClubWaiverPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, session.user.id))
    .orderBy(desc(applications.createdAt))
    .limit(1);

  const [profile] = await db
    .select()
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, session.user.id))
    .limit(1);

  const fullName = application?.fullName ?? profile?.fullName ?? "";
  const matric = application?.matricOrStaffNo ?? "";
  const dept = application?.department ?? profile?.department ?? "";
  const faculty = application?.faculty ?? profile?.faculty ?? "";
  const deptFaculty = [dept, faculty].filter(Boolean).join(" / ");
  const phone = application?.phone ?? profile?.phone ?? "";
  const email = application?.email ?? session.user.email ?? "";
  const phoneEmail = [phone, email].filter(Boolean).join(" / ");
  const emergencyNameRel = [
    application?.emergencyContactName,
    application?.emergencyContactRelationship,
  ]
    .filter(Boolean)
    .join(" / ");

  const fmt = (d: unknown) => (d ? new Date(d as string).toLocaleDateString("en-GB") : "");

  const signed =
    !!application?.waiverRiskAck &&
    !!application?.waiverReleaseAck &&
    !!application?.waiverMedicalAck;

  return (
    <div className="max-w-4xl">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-brand-black">Club Waiver</h1>
        <p className="mt-1 text-sm text-zinc-500">
          The club&apos;s Legal Waiver and Indemnity Form (UTC-W01), the way you signed it.
          Print it, sign it by hand if needed, and return it to the Secretariat alongside
          your Membership Form.
        </p>
        {!application && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            We could not find a submitted application for your account, so this prints
            blank. You can still complete it by hand.
          </p>
        )}
        <div className="mt-4">
          <PrintButton />
        </div>
      </div>

      {/* The waiver itself. On screen it sits in a card; on paper it fills the page. */}
      <div className="mt-6 rounded-xl border border-black/10 bg-white p-6 text-black print:mt-0 print:rounded-none print:border-0 print:p-0">
        <div className="flex items-center justify-center gap-4">
          <Image src="/brand/unilag-logo.png" alt="" width={56} height={56} className="h-14 w-14 object-contain" />
          <div className="text-xl font-bold uppercase tracking-wide">UNILAG Taekwondo Club</div>
          <Image src="/brand/club-logo.png" alt="" width={958} height={966} className="h-14 w-14 object-contain" />
        </div>

        <h1 className="mt-4 text-center text-sm font-bold uppercase leading-snug text-brand-red-dark">
          Release of Liability, Waiver of Claims, Assumption of Risk, and Indemnity
          Agreement
        </h1>

        <div className="mt-3 h-1 w-full bg-black" />

        <div className="mt-4 break-inside-avoid border-l-4 border-brand-red bg-red-50 p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-brand-red-dark">
            Warning: Legal Rights Waiver
          </div>
          <p className="mt-1 text-xs italic leading-relaxed text-zinc-800">
            By signing this document, you are waiving certain legal rights, including the
            right to sue the club, University of Lagos, its sports council, coaches, and
            executive committee members. Please read carefully before signing.
          </p>
        </div>

        <section className="mt-5 break-inside-avoid">
          <h2 className="border-b border-black/70 pb-1 text-xs font-bold uppercase tracking-wider text-black">
            1. Participant Information
          </h2>
          <div className="mt-3 overflow-hidden rounded border border-black/10">
            <div className="grid grid-cols-2 gap-4 bg-[#0f2247] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white">
              <div>Field</div>
              <div>Participant Details</div>
            </div>
            <InfoRow label="Full Name (Surname First)" value={fullName} shaded={false} />
            <InfoRow label="Matriculation / Staff Number" value={matric} shaded />
            <InfoRow label="Department & Faculty" value={deptFaculty} shaded={false} />
            <InfoRow label="Phone Number & Email" value={phoneEmail} shaded />
            <InfoRow
              label="Emergency Contact Name & Relationship"
              value={emergencyNameRel}
              shaded={false}
            />
            <InfoRow
              label="Emergency Contact Phone Number"
              value={application?.emergencyContactPhone}
              shaded
            />
          </div>
        </section>

        <section className="mt-5 break-inside-avoid">
          <h2 className="border-b border-black/70 pb-1 text-xs font-bold uppercase tracking-wider text-black">
            2. Assumption of Risk
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-zinc-800">
            I, the undersigned, acknowledge and fully understand that Taekwondo is a
            full-contact Olympic combat sport. I recognize that participation in training,
            sparring (Kyorugi), forms (Poomsae), self-defense (Ho Shin Sul), and
            competitions involves inherent risks of physical injury.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-800">These risks include, but are not limited to:</p>
          <ul className="mt-1 space-y-1 text-xs leading-relaxed text-zinc-800">
            <li>
              <strong>Minor Injuries:</strong> Scrapes, bruises, muscle strains, sprains,
              and lacerations.
            </li>
            <li>
              <strong>Serious Injuries:</strong> Broken bones, joint dislocations, torn
              ligaments, concussions, and head trauma.
            </li>
            <li>
              <strong>Catastrophic Risks:</strong> In extremely rare instances, permanent
              paralysis or death.
            </li>
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-zinc-800">
            I agree that I am voluntarily participating in these activities as a{" "}
            <strong>student-athlete</strong> with full knowledge of the dangers involved,
            and I knowingly choose to assume all associated risks.
          </p>
        </section>

        <section className="mt-5 break-inside-avoid">
          <h2 className="border-b border-black/70 pb-1 text-xs font-bold uppercase tracking-wider text-black">
            3. Waiver, Release, and Covenant Not to Sue
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-zinc-800">
            In consideration of being allowed to train, travel, and compete with the
            UNILAG Taekwondo Club, I hereby agree to release, waive, and forever discharge
            the University of Lagos, the UNILAG Sports Council, the Head Coach, Assistant
            Coaches, Team Captains, Executive Committee members, and fellow club members
            from any and all liability, claims, demands, actions, or causes of action
            arising out of any loss, damage, or injury (including death) that may be
            sustained by me or to my property, whether caused by negligence or otherwise,
            while participating in club activities.
          </p>
        </section>

        <section className="mt-5 break-inside-avoid">
          <h2 className="border-b border-black/70 pb-1 text-xs font-bold uppercase tracking-wider text-black">
            4. Medical Declaration and Authorization
          </h2>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-800">
            <li>
              <strong>Fitness Status:</strong> I certify that I am in good physical health
              and have no undisclosed medical conditions, cardiovascular issues, or recent
              injuries that would make my participation unsafe.
            </li>
            <li>
              <strong>Emergency Consent:</strong> In the event of an injury or medical
              emergency during club activities, I hereby authorize the coaching staff or
              executive committee to administer first aid (following{" "}
              <Link href="/dashboard/safety" className="text-brand-blue hover:underline">
                R.I.C.E.R. and P.E.A.C.E. &amp; L.O.V.E. protocols
              </Link>
              ) and, if necessary, secure emergency medical treatment, including
              transportation to the University Health Centre (Jaja Clinic) or any nearby
              medical facility.
            </li>
            <li>
              <strong>Financial Liability:</strong> I accept full financial responsibility
              for any medical expenses incurred during my treatment that are not covered
              by the university&apos;s standard student healthcare framework.
            </li>
          </ul>
        </section>

        <section className="mt-5 break-inside-avoid">
          <h2 className="border-b border-black/70 pb-1 text-xs font-bold uppercase tracking-wider text-black">
            5. Code of Conduct &amp; Media Release
          </h2>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-800">
            <li>
              <strong>Compliance:</strong> I agree to abide strictly by the Dojang Code of
              Etiquette and the Disciplinary Policy (Section 8) detailed in the Official
              Club Manual. I understand that reckless behavior or intentional over-contact
              during sparring can result in disciplinary review, up to suspension or
              permanent club expulsion.
            </li>
            <li>
              <strong>Media Consent:</strong> I grant the UNILAG Taekwondo Club permission
              to use photographs or video footage of my training, demonstrations, and
              tournament matches for promotional and institutional publicity purposes,
              unless explicitly revoked by me in writing to the Executive Committee.
            </li>
          </ul>
        </section>

        <section className="mt-5 break-inside-avoid">
          <h2 className="border-b border-black/70 pb-1 text-xs font-bold uppercase tracking-wider text-black">
            6. Acknowledgement of Understanding
          </h2>
          <div className="mt-3 rounded border border-black/20 bg-zinc-50 p-3">
            <p className="text-xs font-bold uppercase leading-relaxed text-black">
              By signing below, I confirm that I am at least 18 years of age, have read
              this entire document, fully understand its terms, understand that I am
              giving up substantial legal rights, and sign it freely and voluntarily.
            </p>
          </div>

          <div className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            <SignatureLine
              label="Participant's Signature"
              value={signed ? application?.waiverSignatureName : null}
            />
            <SignatureLine label="Date" value={signed ? fmt(application?.waiverSignatureDate) : null} />
          </div>
        </section>

        <section className="mt-6 break-inside-avoid border-t border-dotted border-zinc-400 pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-red-dark">
            Parent / Guardian Consent (Required if the Participant is Under 18 Years of
            Age)
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-800">
            I am the parent or legal guardian of the minor named above. I have read this
            liability waiver and consent to their participation in the UNILAG Taekwondo
            Club under the terms outlined above.
          </p>
          <div className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            <SignatureLine label="Parent/Guardian Signature" value={application?.guardianSignature} />
            <SignatureLine label="Date" />
          </div>
        </section>

        <div className="mt-8 flex items-center justify-between border-t border-black/10 pt-2 text-[10px] text-zinc-500">
          <span>University of Lagos Taekwondo Club — Legal Waiver and Indemnity</span>
          <span>Form UTC-W01 (2026)</span>
        </div>
      </div>
    </div>
  );
}
