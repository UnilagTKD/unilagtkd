"use client";

import { useState } from "react";
import { POOMSAE_VIDEOS } from "@/lib/constants";

type PoomsaeVideo = (typeof POOMSAE_VIDEOS)[number];

function embedUrl(video: PoomsaeVideo) {
  const start = "start" in video ? video.start : undefined;
  return `https://www.youtube.com/embed/${video.videoId}${start ? `?start=${start}` : ""}`;
}

export function PoomsaeVideoCards() {
  const [activeId, setActiveId] = useState<string>(POOMSAE_VIDEOS[0].videoId);
  const active = POOMSAE_VIDEOS.find((v) => v.videoId === activeId) ?? POOMSAE_VIDEOS[0];

  const groups = Array.from(new Set(POOMSAE_VIDEOS.map((v) => v.group)));

  return (
    <div>
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-black/10">
        <iframe
          key={activeId}
          src={embedUrl(active)}
          title={active.name}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <p className="mt-2 text-sm font-medium text-brand-black">
        Now playing: {active.name} ({active.rank})
      </p>

      {groups.map((group, gi) => (
        <div key={group} className="mt-6">
          <h3 className={`text-sm font-semibold ${gi % 2 === 0 ? "text-brand-red" : "text-brand-blue"}`}>
            {group}
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {POOMSAE_VIDEOS.filter((v) => v.group === group).map((v) => {
              const isActive = v.videoId === activeId;
              return (
                <button
                  key={v.videoId}
                  type="button"
                  onClick={() => setActiveId(v.videoId)}
                  className={`group overflow-hidden rounded-lg border text-left transition-colors ${
                    isActive
                      ? gi % 2 === 0
                        ? "border-brand-red ring-2 ring-brand-red"
                        : "border-brand-blue ring-2 ring-brand-blue"
                      : "border-black/10 hover:border-zinc-300"
                  }`}
                >
                  <div className="relative aspect-video w-full bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`}
                      alt={v.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brand-black">
                        &#9654;
                      </span>
                    </div>
                    <span
                      className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
                        gi % 2 === 0 ? "bg-brand-red" : "bg-brand-blue"
                      }`}
                    >
                      {v.rank}
                    </span>
                  </div>
                  <div className="px-2 py-1.5 text-xs font-medium text-brand-black">{v.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
