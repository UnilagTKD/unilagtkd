"use client";

import { useRef, useState } from "react";
import { cloudinaryConfigured, uploadToCloudinary } from "@/lib/cloudinary-upload";

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
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  error?: string;
  previewAlt?: string;
  noValueLabel?: string;
  helpText?: string;
  previewClassName?: string;
  itemLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    setLocalError(null);

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLocalError("Please choose an image file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setLocalError("Image must be smaller than 2MB.");
      return;
    }

    // Cloudinary when configured, so images are hosted properly instead of
    // stored as base64 text. Falls back to a data URL otherwise, so the form
    // still works before Cloudinary is set up.
    if (cloudinaryConfigured) {
      setUploading(true);
      const result = await uploadToCloudinary(file);
      setUploading(false);

      if (result.ok) {
        onChange(result.url);
      } else {
        setLocalError(result.error);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(String(reader.result));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-4">
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
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
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
