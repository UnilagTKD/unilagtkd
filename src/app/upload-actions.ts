"use server";

import { createHash } from "node:crypto";
import { requestRateLimit } from "@/lib/shared-rate-limit";
import { isRasterImage, MAX_IMAGE_BYTES, IMAGE_MIME_TYPES } from "@/lib/validation/image";
import { securityLog } from "@/lib/security-log";

export async function uploadImage(form: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!(await requestRateLimit("image-upload", 20, 60 * 60_000)).allowed) return { ok: false, error: "Too many uploads. Please try again later." };
  const file = form instanceof FormData ? form.get("file") : null;
  if (!(file instanceof File) || !IMAGE_MIME_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Choose a PNG, JPEG, or WebP image under 2MB." };
  const dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  if (!isRasterImage(dataUrl)) return { ok: false, error: "This file is not a valid supported image." };
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return { ok: true, url: dataUrl };
  if (!/^[a-z0-9_-]+$/i.test(cloud)) return { ok: false, error: "Image hosting is temporarily unavailable." };
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash("sha256").update(`folder=unilagtkd&timestamp=${timestamp}${secret}`).digest("hex");
  const body = new FormData();
  body.set("file", file); body.set("folder", "unilagtkd"); body.set("timestamp", timestamp);
  body.set("api_key", key); body.set("signature", signature);
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body, signal: AbortSignal.timeout(20_000) });
    const data = await response.json();
    const url = new URL(data.secure_url);
    if (!response.ok || url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !url.pathname.startsWith(`/${cloud}/image/upload/`)) throw new Error("Invalid upload response");
    return { ok: true, url: url.toString() };
  } catch {
    securityLog("image_upload_failed");
    return { ok: false, error: "Upload failed. Please try again." };
  }
}
