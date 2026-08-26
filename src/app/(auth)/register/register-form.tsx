"use client";

import { useState } from "react";
import { useForm, type FieldErrors, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { applicationSchema, type ApplicationInput } from "@/lib/validation/application";
import { Field, inputClass } from "@/components/form/fields";
import { PhotoUpload } from "@/components/form/photo-upload";
import { submitApplication } from "./actions";

type SubCommittee = { id: string; name: string; description: string | null };

const STEPS = [
  "Personal & Academic",
  "Medical History",
  "Experience & Commitments",
  "Liability Waiver",
  "Review & Submit",
] as const;

const STEP_FIELDS: Path<ApplicationInput>[][] = [
  [
    "photoData",
    "membershipCategory",
    "fullName",
    "department",
    "faculty",
    "gender",
    "dob",
    "phone",
    "email",
    "address",
  ],
  ["emergencyContactName", "emergencyContactRelationship", "emergencyContactPhone"],
  [
    "subCommitteePref1Id",
    "subCommitteePref2Id",
    "subCommitteePref3Id",
    "statementOfPurpose",
  ],
  [
    "waiverRiskAck",
    "waiverReleaseAck",
    "waiverMedicalAck",
    "waiverSignatureName",
    "waiverSignatureDate",
    "guardianSignature",
  ],
  [],
];

export function RegisterForm({ subCommittees }: { subCommittees: SubCommittee[] }) {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      photoData: "",
      priorTraining: false,
      waiverRiskAck: false,
      waiverReleaseAck: false,
      waiverMedicalAck: false,
      waiverMediaConsent: false,
      isMinor: false,
    },
  });

  const priorTraining = watch("priorTraining");
  const isMinor = watch("isMinor");
  const photoData = watch("photoData");

  async function next() {
    const fields = STEP_FIELDS[step];
    const valid = fields.length === 0 || (await trigger(fields));
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(data: ApplicationInput) {
    setIsSubmitting(true);
    setSubmitError(null);
    const result = await submitApplication(data);
    setIsSubmitting(false);

    if (result.ok) {
      setSubmitted(true);
    } else {
      setSubmitError(result.error);
    }
  }

  if (submitted) {
    return (
      <div className="mt-12 rounded-2xl border border-black/10 bg-zinc-50 p-8 text-center">
        <h2 className="text-xl font-bold text-brand-black">Application Submitted</h2>
        <p className="mt-3 text-zinc-600">
          Thank you. Your membership application and waiver have been
          received and are pending review by the Executive Committee.
          You&apos;ll be contacted via the email/phone you provided once a
          decision has been made.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-brand-red px-6 py-3 text-sm font-semibold text-white hover:bg-brand-red-dark"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <ol className="flex flex-wrap gap-2 text-xs font-medium">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 ${
              i === step
                ? "bg-brand-red text-white"
                : i < step
                  ? "bg-brand-black text-white"
                  : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-6 rounded-2xl border border-black/10 p-6 sm:p-8"
      >
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-brand-black">
              1. Membership Category &amp; Personal / Academic Profile
            </h2>

            <Field label="Passport Photograph (white background)">
              <PhotoUpload
                value={photoData}
                onChange={(dataUrl) => setValue("photoData", dataUrl, { shouldValidate: true })}
                error={errors.photoData?.message}
              />
            </Field>

            <Field label="Membership Category" error={errors.membershipCategory?.message}>
              <select {...register("membershipCategory")} className={inputClass} defaultValue="">
                <option value="" disabled>
                  Select category
                </option>
                <option value="undergraduate">Student-Member (Undergraduate)</option>
                <option value="postgraduate">Student-Member (Postgraduate)</option>
                <option value="alumni">Alumni-Member</option>
                <option value="non_student">Non-Student Member</option>
              </select>
            </Field>

            <Field label="Full Name (Surname First)" error={errors.fullName?.message}>
              <input {...register("fullName")} className={inputClass} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Matric / Staff Number" error={errors.matricOrStaffNo?.message}>
                <input {...register("matricOrStaffNo")} className={inputClass} />
              </Field>
              <Field label="UTME / JAMB Reg. No" error={errors.utmeJambNo?.message}>
                <input {...register("utmeJambNo")} className={inputClass} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Department" error={errors.department?.message}>
                <input {...register("department")} className={inputClass} />
              </Field>
              <Field label="Faculty / Institution" error={errors.faculty?.message}>
                <input {...register("faculty")} className={inputClass} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Current Level / Year" error={errors.levelYear?.message}>
                <input {...register("levelYear")} className={inputClass} placeholder="e.g. 300" />
              </Field>
              <Field label="Gender" error={errors.gender?.message}>
                <select {...register("gender")} className={inputClass} defaultValue="">
                  <option value="" disabled>
                    Select
                  </option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </Field>
              <Field label="Date of Birth" error={errors.dob?.message}>
                <input type="date" {...register("dob")} className={inputClass} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone Number (WhatsApp/Telegram)" error={errors.phone?.message}>
                <input {...register("phone")} className={inputClass} />
              </Field>
              <Field label="Email Address" error={errors.email?.message}>
                <input type="email" {...register("email")} className={inputClass} />
              </Field>
            </div>

            <Field label="Residential Address" error={errors.address?.message}>
              <textarea {...register("address")} rows={2} className={inputClass} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-brand-black">2. Medical History &amp; Safety Disclosures</h2>
            <p className="text-xs text-zinc-500">
              This information is confidential and only visible to coaches
              and the Welfare Officer.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Blood Group" error={errors.bloodGroup?.message}>
                <input {...register("bloodGroup")} className={inputClass} placeholder="e.g. O+" />
              </Field>
              <Field label="Genotype" error={errors.genotype?.message}>
                <input {...register("genotype")} className={inputClass} placeholder="e.g. AA" />
              </Field>
            </div>

            <Field label="Known Food/Drug Allergies" error={errors.allergies?.message}>
              <input {...register("allergies")} className={inputClass} placeholder="Specify 'None' if not applicable" />
            </Field>

            <Field label="Chronic Medical Conditions" error={errors.chronicConditions?.message}>
              <textarea
                {...register("chronicConditions")}
                rows={2}
                className={inputClass}
                placeholder="Asthma, cardiovascular anomalies, hypertension, seizures, diabetes, etc."
              />
            </Field>

            <Field label="Recent Bone/Joint Injuries" error={errors.recentInjuries?.message}>
              <textarea
                {...register("recentInjuries")}
                rows={2}
                className={inputClass}
                placeholder="Dislocations, fractures, ligament tears, spinal slips, or recent surgeries"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Emergency Contact Name" error={errors.emergencyContactName?.message}>
                <input {...register("emergencyContactName")} className={inputClass} />
              </Field>
              <Field label="Relationship to Member" error={errors.emergencyContactRelationship?.message}>
                <input {...register("emergencyContactRelationship")} className={inputClass} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Emergency Contact Phone" error={errors.emergencyContactPhone?.message}>
                <input {...register("emergencyContactPhone")} className={inputClass} />
              </Field>
              <Field label="Alternative Phone" error={errors.altPhone?.message}>
                <input {...register("altPhone")} className={inputClass} />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-brand-black">
              3. Martial Arts Experience &amp; Structural Commitments
            </h2>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("priorTraining")} />
              I have prior Taekwondo training
            </label>

            {priorTraining && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Current Belt / Grade" error={errors.beltGrade?.message}>
                  <input {...register("beltGrade")} className={inputClass} />
                </Field>
                <Field label="Affiliated Club / Academy" error={errors.affiliatedClub?.message}>
                  <input {...register("affiliatedClub")} className={inputClass} />
                </Field>
              </div>
            )}

            <div>
              <span className="text-sm font-medium text-zinc-700">
                Mandatory Sub-Committee Preference (rank 1 to 3)
              </span>
              <p className="text-xs text-zinc-500">
                Per the club manual, all active members serve on one
                sub-structure.
              </p>
              <div className="mt-2 grid gap-4 sm:grid-cols-3">
                <Field label="1st Preference" error={errors.subCommitteePref1Id?.message}>
                  <select {...register("subCommitteePref1Id")} className={inputClass} defaultValue="">
                    <option value="" disabled>
                      Select
                    </option>
                    {subCommittees.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="2nd Preference" error={errors.subCommitteePref2Id?.message}>
                  <select {...register("subCommitteePref2Id")} className={inputClass} defaultValue="">
                    <option value="" disabled>
                      Select
                    </option>
                    {subCommittees.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="3rd Preference" error={errors.subCommitteePref3Id?.message}>
                  <select {...register("subCommitteePref3Id")} className={inputClass} defaultValue="">
                    <option value="" disabled>
                      Select
                    </option>
                    {subCommittees.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <Field label="Short Statement of Purpose" error={errors.statementOfPurpose?.message}>
              <textarea
                {...register("statementOfPurpose")}
                rows={4}
                className={inputClass}
                placeholder="Why do you want to join, and how will you balance training with your academic workload?"
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-brand-black">4. Liability Waiver (UTC-W01)</h2>

            <div className="space-y-3 rounded-lg bg-zinc-50 p-4 text-xs text-zinc-600">
              <p>
                <strong>Assumption of Risk:</strong> Taekwondo is a
                full-contact Olympic combat sport. Participation involves
                inherent risk of injury, from minor bruises and strains to,
                in rare cases, serious or catastrophic injury. I voluntarily
                assume these risks.
              </p>
              <p>
                <strong>Waiver &amp; Release:</strong> I release the
                University of Lagos, the UNILAG Sports Council, the coaching
                staff, and the Executive Committee from liability for any
                loss, damage, or injury sustained while participating in
                club activities.
              </p>
              <p>
                <strong>Medical Declaration:</strong> I certify I am in good
                physical health and authorize coaching staff/Exco to
                administer first aid and secure emergency medical treatment
                if needed, at my own financial responsibility where not
                covered by university healthcare.
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" {...register("waiverRiskAck")} className="mt-1" />
              <span>I acknowledge and accept the Assumption of Risk.</span>
            </label>
            {errors.waiverRiskAck && (
              <p className="text-xs text-brand-red">{errors.waiverRiskAck.message}</p>
            )}

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" {...register("waiverReleaseAck")} className="mt-1" />
              <span>I agree to the Waiver, Release, and Covenant Not to Sue.</span>
            </label>
            {errors.waiverReleaseAck && (
              <p className="text-xs text-brand-red">{errors.waiverReleaseAck.message}</p>
            )}

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" {...register("waiverMedicalAck")} className="mt-1" />
              <span>I confirm the Medical Declaration and Emergency Authorization.</span>
            </label>
            {errors.waiverMedicalAck && (
              <p className="text-xs text-brand-red">{errors.waiverMedicalAck.message}</p>
            )}

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" {...register("waiverMediaConsent")} className="mt-1" />
              <span>
                I grant the club permission to use photos/video of me for
                promotional purposes (optional, you may revoke in writing
                later).
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" {...register("isMinor")} className="mt-1" />
              <span>I am under 18 years of age (parent/guardian consent required).</span>
            </label>

            {isMinor && (
              <div className="grid gap-4 rounded-lg border border-black/10 p-4 sm:grid-cols-2">
                <Field label="Parent / Guardian Name" error={errors.guardianName?.message}>
                  <input {...register("guardianName")} className={inputClass} />
                </Field>
                <Field label="Parent / Guardian Signature (type full name)" error={errors.guardianSignature?.message}>
                  <input {...register("guardianSignature")} className={inputClass} />
                </Field>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Applicant's Signature (type full name)" error={errors.waiverSignatureName?.message}>
                <input {...register("waiverSignatureName")} className={inputClass} />
              </Field>
              <Field label="Date" error={errors.waiverSignatureDate?.message}>
                <input type="date" {...register("waiverSignatureDate")} className={inputClass} />
              </Field>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-brand-black">5. Review &amp; Submit</h2>
            <p className="text-sm text-zinc-600">
              By submitting, you certify that all information provided is
              true, accurate, and complete, and pledge to uphold the five
              tenets of Taekwondo (Courtesy, Integrity, Perseverance,
              Self-Control, Indomitable Spirit) and the club&apos;s code of
              conduct.
            </p>
            {Object.keys(errors).length > 0 && (
              <FormErrorsSummary errors={errors} />
            )}
            {submitError && <p className="text-sm text-brand-red">{submitError}</p>}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-black/10 pt-6">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 disabled:opacity-40"
          >
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-full bg-brand-red px-6 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-brand-red px-6 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function FormErrorsSummary({ errors }: { errors: FieldErrors<ApplicationInput> }) {
  const messages = Object.values(errors)
    .map((e) => e?.message)
    .filter(Boolean);

  if (messages.length === 0) return null;

  return (
    <ul className="list-inside list-disc rounded-lg bg-red-50 p-4 text-sm text-brand-red">
      {messages.map((m, i) => (
        <li key={i}>{m as string}</li>
      ))}
    </ul>
  );
}
