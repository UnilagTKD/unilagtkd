"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-brand-red px-5 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark"
    >
      Download / Print form
    </button>
  );
}
