"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteImage } from "@/components/site-image";

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
  const [interacting, setInteracting] = useState(false);

  useEffect(() => {
    if (paused || interacting || slides.length <= 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 6000);
    return () => clearInterval(id);
  }, [paused, interacting, slides.length]);

  return (
    <section
      className="relative overflow-hidden bg-brand-black text-white"
      aria-roledescription="carousel"
      aria-label="UNILAG Taekwondo Club highlights"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}
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
            {slide.image && i === index && (
              <SiteImage
                src={slide.image}
                alt=""
                fill
                sizes="100vw"
                preload={i === 0}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/70 to-brand-black/30" />

            <div className="relative mx-auto flex h-full max-w-[1800px] flex-col items-start justify-center gap-6 px-4 sm:px-6">
              <span className="animate-fade-in-up rounded-full bg-brand-red px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
                {slide.eyebrow}
              </span>
              {i === 0 ? <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">{slide.title}</h1> : <h2 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">{slide.title}</h2>}
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
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
                className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-white"
              ><span className={`h-2 rounded-full ${i === index ? "w-6 bg-brand-red" : "w-2 bg-white/40"}`} /></button>
            ))}
          </div>
          <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused} className="absolute bottom-5 right-4 rounded-full bg-black/50 px-3 py-2 text-xs font-medium">{paused ? "Play slides" : "Pause slides"}</button>

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
