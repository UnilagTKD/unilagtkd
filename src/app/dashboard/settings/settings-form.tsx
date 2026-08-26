"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/form/fields";
import { PasswordInput } from "@/components/form/password-input";
import { updateOwnProfile, changeOwnPassword } from "./actions";
import { BELT_SYSTEM } from "@/lib/constants";

export function SettingsForm({
  email,
  fullName,
  initialUsername,
  initialPhone,
  initialAddress,
  initialAvatarUrl,
  initialBeltGrade,
}: {
  email: string;
  fullName: string;
  initialUsername: string;
  initialPhone: string;
  initialAddress: string;
  initialAvatarUrl: string;
  initialBeltGrade: string;
}) {
  const [username, setUsername] = useState(initialUsername);
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [beltGrade, setBeltGrade] = useState(initialBeltGrade);
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

    const result = await updateOwnProfile({ username, phone, address, avatarUrl, beltGrade });
    setProfileSaving(false);

    if (result.ok) {
      setProfileSaved(true);
    } else {
      setProfileError(result.error);
    }
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
    } else {
      setPasswordError(result.error);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onSaveProfile} className="space-y-4 rounded-xl border border-black/10 bg-white p-6">
        <h2 className="font-semibold text-brand-black">Profile</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name">
            <input value={fullName} disabled className={`${inputClass} bg-zinc-50 text-zinc-500`} />
          </Field>
          <Field label="Email">
            <input value={email} disabled className={`${inputClass} bg-zinc-50 text-zinc-500`} />
          </Field>
        </div>
        <p className="text-xs text-zinc-500">
          Name and email are tied to your membership record. Contact the
          Executive Committee to change them.
        </p>

        <Field label="Username (optional)">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. jane_athlete"
            className={inputClass}
          />
        </Field>
        <p className="-mt-2 text-xs text-zinc-500">
          3-30 characters: letters, numbers, and underscores only.
        </p>

        <Field label="Belt / Grade">
          <select
            value={beltGrade}
            onChange={(e) => setBeltGrade(e.target.value)}
            className={inputClass}
          >
            <option value="">Unranked</option>
            {BELT_SYSTEM.map((b) => (
              <option key={b.belt} value={`${b.belt} (${b.grade})`}>
                {b.belt} ({b.grade})
              </option>
            ))}
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
        <Field label="Avatar Image URL (optional)">
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </Field>

        {profileError && <p className="text-sm text-brand-red">{profileError}</p>}
        {profileSaved && <p className="text-sm text-green-600">Profile updated.</p>}

        <button
          type="submit"
          disabled={profileSaving}
          className="rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60"
        >
          {profileSaving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <form
        onSubmit={onChangePassword}
        className="space-y-4 rounded-xl border border-black/10 bg-white p-6"
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
          className="rounded-full bg-brand-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
        >
          {passwordSaving ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
