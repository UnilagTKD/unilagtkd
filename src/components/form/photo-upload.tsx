"use client";

import { useRef, useState } from "react";
import { uploadImage } from "@/app/upload-actions";
import { IMAGE_MIME_TYPES } from "@/lib/validation/image";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function PhotoUpload({
  value,
  onChange,
  error,
  previewAlt = "Passport preview",
  noValueLabel = "No photo\nselected",
  helpText = "Passport-style photo, white background, under 2MB.",
  previewClassName = "object-cover",
  itemLabel = "Photo",
  privateUpload = false,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  error?: string;
  previewAlt?: string;
  noValueLabel?: string;
  helpText?: string;
  previewClassName?: string;
  itemLabel?: string;
  privateUpload?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    setLocalError(null);

    if (!file) return;

    if (!IMAGE_MIME_TYPES.includes(file.type)) {
      setLocalError("Please choose a PNG, JPEG, or WebP image.");
      return;
    }

    if (file.size > (privateUpload ? 1024 * 1024 : MAX_FILE_SIZE)) {
      setLocalError(`Image must be smaller than ${privateUpload ? "1MB" : "2MB"}.`);
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    try {
      if (privateUpload) {
        const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Could not read receipt")); reader.readAsDataURL(file); });
        onChange(data);
        return;
      }
      const result = await uploadImage(form);
      if (result.ok) onChange(result.url);
      else setLocalError(result.error);
    } catch { setLocalError("Upload failed. Please try again."); }
    finally { setUploading(false); }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-24 w-24 flex-none items-center justify-center overflow-hidden rounded-lg border border-zinc-300 bg-zinc-50">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={previewAlt} className={`h-full w-full ${previewClassName}`} />
        ) : (
          <span className="text-center text-[10px] text-zinc-400 whitespace-pre-line">
            {noValueLabel}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 basis-40">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="hidden"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          {uploading ? "Uploading..." : value ? `Change ${itemLabel}` : `Choose ${itemLabel}`}
        </button>
        <p className="mt-1 text-xs text-zinc-500">{helpText}</p>
        {(localError || error) && (
          <p className="mt-1 text-xs text-brand-red">{localError || error}</p>
        )}
      </div>
    </div>
  );
}
