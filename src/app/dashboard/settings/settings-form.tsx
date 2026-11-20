"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Field, inputClass } from "@/components/form/fields";
import { PasswordInput } from "@/components/form/password-input";
import { updateOwnProfile, changeOwnPassword } from "./actions";
import { RANKS, resolveRank } from "@/lib/grading";
import { BELT_SYSTEM } from "@/lib/constants";
import { type MembershipCategory } from "@/lib/validation/academic";

export function SettingsForm({
  email,
  isCoach,
  fullName: initialFullName,
  initialDepartment,
  initialFaculty,
  initialLevelYear,
  initialUsername,
  hasPendingRequest,
  initialPhone,
  initialAddress,
  initialBeltGrade,
  initialMembershipCategory,
  initialMatricOrStaffNo,
  initialGraduationYear,
  initialInstitution,
  initialOccupation,
}: {
  email: string;
  isCoach: boolean;
  fullName: string;
  initialDepartment: string;
  initialFaculty: string;
  initialLevelYear: string;
  initialUsername: string;
  hasPendingRequest: boolean;
  initialPhone: string;
  initialAddress: string;
  initialBeltGrade: string;
  initialMembershipCategory: MembershipCategory;
  initialMatricOrStaffNo: string;
  initialGraduationYear: string;
  initialInstitution: string;
  initialOccupation: string;
}) {
  const router = useRouter();
  const fullName = initialFullName;
  const [department, setDepartment] = useState(initialDepartment);
  const [faculty, setFaculty] = useState(initialFaculty);
  const [membershipCategory, setMembershipCategory] = useState<MembershipCategory>(initialMembershipCategory);
  const [matricOrStaffNo, setMatricOrStaffNo] = useState(initialMatricOrStaffNo);
  const [graduationYear, setGraduationYear] = useState(initialGraduationYear);
  const [institution, setInstitution] = useState(initialInstitution);
  const [occupation, setOccupation] = useState(initialOccupation);
  const [changeReason, setChangeReason] = useState("");
  const [academicConfirmed, setAcademicConfirmed] = useState(false);
  const [levelYear, setLevelYear] = useState(initialLevelYear);
  const academicChanged = department !== initialDepartment || faculty !== initialFaculty || membershipCategory !== initialMembershipCategory || matricOrStaffNo !== initialMatricOrStaffNo || graduationYear !== initialGraduationYear || institution !== initialInstitution || occupation !== initialOccupation || levelYear !== initialLevelYear;
  const username = initialUsername;
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [beltGrade, setBeltGrade] = useState(initialBeltGrade);
  const resolvedBelt = resolveRank(beltGrade).rank;
  const coachBeltValue = resolvedBelt.belt === "Black Belt" ? `${resolvedBelt.belt} ${resolvedBelt.grade}` : "";
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);

    try {
      const result = await updateOwnProfile({ levelYear, phone, address, beltGrade, department, faculty, membershipCategory, matricOrStaffNo, graduationYear, institution, occupation }, academicChanged ? { confirmed: academicConfirmed, reason: changeReason } : undefined);
      if (result.ok) { setProfileSaved(true); router.refresh(); }
      else setProfileError(result.error);
    } catch { setProfileError("Could not save your profile. Please try again."); }
    finally { setProfileSaving(false); }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    const result = await changeOwnPassword(currentPassword, newPassword);
    setPasswordSaving(false);

    if (result.ok) {
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await signOut({ callbackUrl: "/login" });
    } else {
      setPasswordError(result.error);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onSaveProfile} className="space-y-4 rounded-xl border border-black/10 bg-white p-4 sm:p-6">
        <h2 className="font-semibold text-brand-black">Profile</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name">
            <input value={fullName} readOnly aria-readonly="true" className={inputClass} />
          </Field>
          <Field label="Sign-in email">
            <input value={email} disabled className={`${inputClass} bg-zinc-50 text-zinc-500`} />
          </Field>
        </div>
        <p className="text-xs text-zinc-500">
          Name, email, and username remain fixed. Membership category, course, academic details, and contact changes require admin verification. Belt-only changes may be approved by a coach or admin. Your approved details remain in place until review.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Membership category"><select value={membershipCategory} onChange={e=>{setMembershipCategory(e.target.value as MembershipCategory);setAcademicConfirmed(false);}} className={inputClass}><option value="undergraduate">Student — Undergraduate</option><option value="postgraduate">Student — Postgraduate</option><option value="alumni">Alumni</option><option value="non_student">Non-student</option><option value="staff">Staff</option></select></Field>
          <Field label="Matriculation / Former matric / Staff number"><input value={matricOrStaffNo} onChange={e=>setMatricOrStaffNo(e.target.value)} maxLength={100} className={inputClass}/></Field>
          <Field label="Department / Course / Unit"><input value={department} onChange={e=>setDepartment(e.target.value)} maxLength={150} className={inputClass} /></Field>
          <Field label="Faculty"><input value={faculty} onChange={e=>setFaculty(e.target.value)} maxLength={150} className={inputClass} /></Field>
          <Field label="Level / Year"><input value={levelYear} onChange={(e) => setLevelYear(e.target.value)} maxLength={20} className={inputClass} /></Field>
          {membershipCategory==="alumni"&&<Field label="Graduation year"><input inputMode="numeric" value={graduationYear} onChange={e=>setGraduationYear(e.target.value)} maxLength={4} placeholder="e.g. 2026" className={inputClass}/></Field>}
          <Field label="Institution / Organisation"><input value={institution} onChange={e=>setInstitution(e.target.value)} maxLength={200} className={inputClass}/></Field>
          {(membershipCategory==="non_student"||membershipCategory==="alumni")&&<Field label="Occupation / Current activity"><input value={occupation} onChange={e=>setOccupation(e.target.value)} maxLength={150} className={inputClass}/></Field>}
        </div>
        {academicChanged&&<div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-4"><p className="text-sm">Provide the details relevant to your new category: students need matriculation number/course/faculty/level; alumni need former matriculation number/course/faculty/graduation year; staff need staff number/unit/institution; non-students need occupation or current activity.</p><Field label="Reason for the membership / academic change"><textarea value={changeReason} onChange={e=>setChangeReason(e.target.value)} minLength={10} maxLength={2000} required className={inputClass}/></Field><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={academicConfirmed} onChange={e=>setAcademicConfirmed(e.target.checked)} required className="mt-1"/><span>I confirm these details are accurate and understand that admin must verify them before they take effect.</span></label></div>}
        <Field label="Username">
          <input
            value={username}
            readOnly
            aria-readonly="true"
            placeholder="e.g. jane_athlete"
            className={inputClass}
          />
        </Field>
        <p className="-mt-2 text-xs text-zinc-500">
          Assigned during registration.
        </p>

        <Field label="Belt / Grade">
          <select
            aria-label="Belt / Grade"
            value={isCoach ? coachBeltValue : beltGrade}
            onChange={(e) => setBeltGrade(e.target.value)}
            className={inputClass}
          >
            {isCoach ? <>
              <option value="" disabled>Select Black Belt Dan</option>
              {RANKS.filter((r) => r.belt === "Black Belt").map((r) => <option key={r.id} value={`${r.belt} ${r.grade}`}>{r.belt}, {r.grade}</option>)}
            </> : <>
              <option value="">Unranked</option>
              {beltGrade && !BELT_SYSTEM.some((b) => `${b.belt} (${b.grade})` === beltGrade) && <option value={beltGrade}>{beltGrade}</option>}
              {BELT_SYSTEM.map((b) => <option key={b.belt} value={`${b.belt} (${b.grade})`}>{b.belt} ({b.grade})</option>)}
            </>}
          </select>
        </Field>

        <Field label="Phone Number">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Residential Address">
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </Field>
        {profileError && <p role="alert" className="text-sm text-brand-red">{profileError}</p>}
        {profileSaved && <p role="status" className="text-sm text-green-600">Profile change request submitted. Your approved details stay in place until review.</p>}

        <button
          type="submit"
          disabled={profileSaving || hasPendingRequest}
          className="w-full sm:w-auto rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60"
        >
          {profileSaving ? "Submitting..." : hasPendingRequest ? "Awaiting approval" : "Request Profile Changes"}
        </button>
      </form>

      <form
        onSubmit={onChangePassword}
        className="space-y-4 rounded-xl border border-black/10 bg-white p-4 sm:p-6"
      >
        <h2 className="font-semibold text-brand-black">Change Password</h2>

        <Field label="Current Password">
          <PasswordInput
            value={currentPassword}
            onChange={setCurrentPassword}
            required
            autoComplete="current-password"
          />
        </Field>
        <Field label="New Password">
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm New Password">
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>

        {passwordError && <p className="text-sm text-brand-red">{passwordError}</p>}
        {passwordSaved && <p className="text-sm text-green-600">Password updated.</p>}

        <button
          type="submit"
          disabled={passwordSaving}
          className="w-full sm:w-auto rounded-full bg-brand-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
        >
          {passwordSaving ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
