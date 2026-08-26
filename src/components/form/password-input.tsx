"use client";

import { useState } from "react";
import { inputClass } from "./fields";

export function PasswordInput({
  value,
  onChange,
  required,
  minLength,
  name,
  withLockIcon,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  name?: string;
  withLockIcon?: boolean;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {withLockIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-zinc-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      )}
      <input
        type={visible ? "text" : "password"}
        name={name}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} pr-10 ${withLockIcon ? "pl-10" : ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400 hover:text-zinc-600"
      >
        {visible ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.53 13.53 0 0 0 2 11s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <path d="M2 2l20 20" />
          </svg>
        )}
      </button>
    </div>
  );
}
