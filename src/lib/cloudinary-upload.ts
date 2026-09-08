"use client";

// Client-side unsigned upload. No secret involved - the preset on Cloudinary's
// side controls what's allowed (folder, size, formats), which is the whole
// point of an unsigned preset.
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export const cloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

export async function uploadToCloudinary(
  file: File
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return { ok: false, error: "Cloudinary is not configured." };
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      return { ok: false, error: "Upload failed. Please try again." };
    }

    const data = await res.json();
    if (typeof data.secure_url !== "string") {
      return { ok: false, error: "Upload failed. Please try again." };
    }

    return { ok: true, url: data.secure_url };
  } catch {
    return { ok: false, error: "Upload failed. Check your connection and try again." };
  }
}
