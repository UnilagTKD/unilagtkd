"use client";

import { useRef, useState } from "react";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function PhotoUpload({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
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
          <img src={value} alt="Passport preview" className="h-full w-full object-cover" />
        ) : (
          <span className="text-center text-[10px] text-zinc-400">
            No photo
            <br />
            selected
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
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {value ? "Change Photo" : "Choose Photo"}
        </button>
        <p className="mt-1 text-xs text-zinc-500">
          Passport-style photo, white background, under 2MB.
        </p>
        {(localError || error) && (
          <p className="mt-1 text-xs text-brand-red">{localError || error}</p>
        )}
      </div>
    </div>
  );
}
