import Image from "next/image";
import { AFFILIATIONS } from "@/lib/constants";

export function AffiliationBadges({ variant = "light" }: { variant?: "light" | "dark" }) {
  const isDark = variant === "dark";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {AFFILIATIONS.map((org) =>
        "logo" in org && org.logo ? (
          <span
            key={org.short}
            title={org.name}
            className="flex h-8 items-center rounded-full bg-white px-2.5 py-1 shadow-sm"
          >
            <Image
              src={org.logo}
              alt={org.name}
              width={80}
              height={24}
              className="h-5 w-auto object-contain"
            />
          </span>
        ) : (
          <span
            key={org.short}
            title={org.name}
            className={
              isDark
                ? "rounded-full border border-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-zinc-300"
                : "rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-zinc-600"
            }
          >
            {org.short}
          </span>
        )
      )}
    </div>
  );
}
