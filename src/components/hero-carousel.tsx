"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type HeroSlide = {
  image?: string | null;
  eyebrow: string;
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 6000);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  return (
    <section
      className="relative overflow-hidden bg-brand-black text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[520px] sm:h-[560px]">
        {slides.map((slide, i) => (
          <div
            key={i}
            aria-hidden={i !== index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {slide.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/70 to-brand-black/30" />

            <div className="relative mx-auto flex h-full max-w-6xl flex-col items-start justify-center gap-6 px-4 sm:px-6">
              <span className="animate-fade-in-up rounded-full bg-brand-red px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
                {slide.eyebrow}
              </span>
              <h1 className="animate-fade-in-up animate-delay-1 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
                {slide.title}
              </h1>
              <p className="animate-fade-in-up animate-delay-2 max-w-xl text-lg text-zinc-300">
                {slide.description}
              </p>
              <div className="animate-fade-in-up animate-delay-3 flex flex-wrap gap-3">
                <Link
                  href={slide.ctaHref}
                  className="rounded-full bg-brand-red px-6 py-3 text-sm font-semibold text-white hover:bg-brand-red-dark"
                >
                  {slide.ctaLabel}
                </Link>
                {slide.secondaryHref && slide.secondaryLabel && (
                  <Link
                    href={slide.secondaryHref}
                    className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    {slide.secondaryLabel}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-brand-red" : "w-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 sm:block"
          >
            &#8592;
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setIndex((i) => (i + 1) % slides.length)}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 sm:block"
          >
            &#8594;
          </button>
        </>
      )}
    </section>
  );
}
