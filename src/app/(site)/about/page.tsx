import { publicMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import {
  TENETS,
  TRAINING_PILLARS,
  BELT_SYSTEM,
  TRAINING_SCHEDULE,
  VISION,
  MISSION,
  AFFILIATIONS,
} from "@/lib/constants";
import { AffiliationBadges } from "@/components/affiliation-badges";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = publicMetadata("/about");

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1800px] px-4 py-16 sm:px-6">
      <span className="text-sm font-semibold uppercase tracking-widest text-brand-red">
        About Us
      </span>
      <h1 className="mt-2 text-3xl font-bold text-brand-black sm:text-4xl">
        The UNILAG Taekwondo Club
      </h1>

      <div className="prose prose-zinc mt-8 max-w-none space-y-4 text-zinc-700">
        <p>
          The UNILAG Taekwondo Club is the fully recognized, officially
          registered varsity Taekwondo club of the University of Lagos,
          training student-athletes in sparring (Kyorugi), forms (Poomsae),
          and self-defense (Ho Shin Sul), and developing student-athletes to
          represent the institution across the collegiate sports landscape,
          including the Nigeria University Games (NUGA).
        </p>
        <p>
          The club&apos;s lineage traces back to the International Taekwondo
          Academy, Unilag (ITA Unilag), founded by Grandmaster George Ashiru,
          one of the pioneers of martial arts in Nigeria, cross-trained
          across both ITF and WT systems. That legacy training entity is
          continued today as the UNILAG Taekwondo Club, operating within the
          university&apos;s clubs and societies framework and aligned with
          the Nigeria Taekwondo Federation (NTF), Kukkiwon, and World
          Taekwondo (WT).
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-2xl bg-zinc-50 p-8">
            <h2 className="text-xl font-bold text-brand-black">Our Vision</h2>
            <p className="mt-3 italic text-zinc-700">&ldquo;{VISION}&rdquo;</p>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="h-full rounded-2xl bg-zinc-50 p-8">
            <h2 className="text-xl font-bold text-brand-black">Our Mission</h2>
            <p className="mt-3 italic text-zinc-700">&ldquo;{MISSION}&rdquo;</p>
          </div>
        </Reveal>
      </div>

      <div className="mt-16">
        <h2 className="text-xl font-bold text-brand-black">
          The Five Tenets of Taekwondo
        </h2>
        <p className="mt-2 text-zinc-600">
          Every member pledges, upon joining, to uphold these five tenets,
          in training, in academics, and in daily life.
        </p>
        <div className="mt-6 space-y-4">
          {TENETS.map((tenet, i) => (
            <Reveal key={tenet.name} delay={i * 80}>
              <div className="flex gap-4 rounded-xl border border-black/10 p-5">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-red text-sm font-bold text-white">
                  {i + 1}
                </div>
                <div>
                  <div className="font-semibold text-brand-black">
                    {tenet.name}{" "}
                    <span className="font-normal text-zinc-400">({tenet.ko})</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">{tenet.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-xl font-bold text-brand-black">The Four Training Pillars</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {TRAINING_PILLARS.map((p, i) => (
            <Reveal key={p.name} delay={i * 100}>
              <div
                className={`h-full rounded-xl border-t-4 border border-black/10 p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md ${
                  p.accent === "red" ? "border-t-brand-red" : "border-t-brand-blue"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      p.accent === "red" ? "bg-brand-red" : "bg-brand-blue"
                    }`}
                  />
                  <div className="font-semibold text-brand-black">{p.name}</div>
                </div>
                <p className="mt-2 text-sm text-zinc-600">{p.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-sm text-zinc-600">
          Regular training runs <strong>{TRAINING_SCHEDULE.days}</strong>,{" "}
          {TRAINING_SCHEDULE.time}. Supplementary training blocks and
          pre-tournament fight camps are announced as needed by the coaching
          staff.
        </p>
      </div>

      <div className="mt-16">
        <h2 className="text-xl font-bold text-brand-black">Belt System Progression</h2>
        <p className="mt-2 text-zinc-600">
          Rank evolution follows the standard Geup and Dan framework, from
          White Belt (10th Geup) to Black Belt (1st Dan+).
        </p>
        <div className="mt-6 space-y-3">
          {BELT_SYSTEM.map((b, i) => (
            <Reveal key={b.belt} delay={i * 70}>
              <div className="flex items-center gap-4 rounded-xl border border-black/10 p-4 transition-transform duration-200 hover:translate-x-1">
                <span
                  className={`h-10 w-10 flex-none rounded-full ${b.swatch} ${b.ring}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold text-brand-black">{b.belt}</span>
                    <span className="text-xs uppercase tracking-wide text-zinc-400">
                      {b.grade}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-600">{b.meaning}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-xl font-bold text-brand-black">
          Regulatory &amp; Federation Affiliations
        </h2>
        <p className="mt-2 text-zinc-600">
          To preserve official regulatory alignment and elite competitive
          pathways, the club maintains structural and regulatory frameworks
          aligned directly with:
        </p>
        <div className="mt-4">
          <AffiliationBadges />
        </div>
        <ul className="mt-6 space-y-3 text-sm text-zinc-700">
          {AFFILIATIONS.map((org, i) => (
            <li key={org.short}>
              <Reveal delay={i * 60} className="flex gap-3">
                <span className="flex h-6 w-10 flex-none items-center justify-center rounded bg-zinc-100 text-[10px] font-bold text-zinc-600">
                  {org.short}
                </span>
                <span>{org.name}</span>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
