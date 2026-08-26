import Link from "next/link";
import { db } from "@/db";
import { achievements, galleryItems, users, subCommittees, insights } from "@/db/schema";
import { desc, count, inArray, eq, and } from "drizzle-orm";
import { TENETS, MEDAL_STYLES, TRAINING_PILLARS, TRAINING_SCHEDULE } from "@/lib/constants";
import { MEMBER_ROLES } from "@/lib/roles";
import { HeroCarousel, type HeroSlide } from "@/components/hero-carousel";
import { Reveal } from "@/components/reveal";

const INSIGHT_CATEGORY_LABELS: Record<string, string> = {
  training: "Training",
  competition: "Competition",
  club_news: "Club News",
  wellness: "Wellness",
};

export default async function HomePage() {
  const [
    recentAchievements,
    recentPhotos,
    recentInsights,
    [{ medalCount }],
    [{ memberCount }],
    [{ subCommitteeCount }],
  ] = await Promise.all([
    db.select().from(achievements).orderBy(desc(achievements.competitionDate)).limit(3),
    db.select().from(galleryItems).orderBy(desc(galleryItems.createdAt)).limit(4),
    db.select().from(insights).orderBy(desc(insights.createdAt)).limit(3),
    db.select({ medalCount: count() }).from(achievements),
    db
      .select({ memberCount: count() })
      .from(users)
      .where(and(inArray(users.role, [...MEMBER_ROLES]), eq(users.status, "active"))),
    db.select({ subCommitteeCount: count() }).from(subCommittees),
  ]);

  const STATS = [
    { label: "Medals Won", value: medalCount, accent: "red" as const },
    { label: "Active Members", value: memberCount, accent: "blue" as const },
    { label: "Sub-Committees", value: subCommitteeCount, accent: "red" as const },
    { label: "Sessions / Week", value: 3, accent: "blue" as const },
  ];

  const heroImages = recentPhotos.map((p) => p.imageUrl);

  const heroSlides: HeroSlide[] = [
    {
      image: heroImages[0],
      eyebrow: "University of Lagos",
      title: "Discipline, Respect, and Excellence on the Mat.",
      description:
        "The UNILAG Taekwondo Club trains student-athletes in the Olympic combat sport of Taekwondo, building champions in competition and in character.",
      ctaHref: "/register",
      ctaLabel: "Register for Membership",
      secondaryHref: "/about",
      secondaryLabel: "Learn About the Club",
    },
    {
      image: heroImages[1],
      eyebrow: "Kyorugi · Poomsae · Ho Shin Sul",
      title: "Elite WT-Style Training, Every Week.",
      description:
        "From sparring to forms to self-defense, our four training pillars build well-rounded, competition-ready athletes.",
      ctaHref: "/about",
      ctaLabel: "Explore Our Training",
      secondaryHref: "/structure",
      secondaryLabel: "Meet the Coaches",
    },
    {
      image: heroImages[2],
      eyebrow: "NUGA · WAUG · FASU · FISU",
      title: "Representing UNILAG on the National Stage.",
      description:
        "Our athletes compete at the Nigeria University Games and beyond, bringing home medals and honour for the university.",
      ctaHref: "/achievements",
      ctaLabel: "See Our Achievements",
      secondaryHref: "/gallery",
      secondaryLabel: "View Gallery",
    },
  ];

  return (
    <>
      <HeroCarousel slides={heroSlides} />

      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-10 sm:px-6 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`animate-fade-in-up animate-delay-${Math.min(i + 1, 5)} text-center`}
            >
              <div
                className={`text-3xl font-bold ${
                  stat.accent === "red" ? "text-brand-red" : "text-brand-blue"
                }`}
              >
                {stat.value}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-brand-red">
          The Five Tenets
        </h2>
        <p className="mt-2 max-w-2xl text-zinc-600">
          Every member pledges to uphold the five tenets of Taekwondo, both on
          and off the mat.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {TENETS.map((tenet, i) => (
            <div
              key={tenet.name}
              className={`animate-fade-in-up animate-delay-${Math.min(i + 1, 5)} rounded-xl border border-black/10 p-4 text-center transition-transform duration-200 hover:-translate-y-1 hover:shadow-md`}
            >
              <div className="text-sm font-semibold text-brand-black">{tenet.name}</div>
              <div className="mt-1 text-xs text-zinc-500">{tenet.ko}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-brand-blue">
              How We Train
            </h2>
            <Link href="/about" className="text-sm font-medium text-brand-blue hover:underline">
              Full training details &rarr;
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRAINING_PILLARS.map((p, i) => (
              <Reveal key={p.name} delay={i * 100}>
                <div
                  className={`h-full rounded-xl border border-black/10 bg-white p-5 border-t-4 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md ${
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
          <p className="mt-6 text-sm text-zinc-600">
            Regular training runs <strong>{TRAINING_SCHEDULE.days}</strong>,{" "}
            {TRAINING_SCHEDULE.time}.
          </p>
        </div>
      </section>

      {recentPhotos.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-brand-blue">
              From the Dojang
            </h2>
            <Link href="/gallery" className="text-sm font-medium text-brand-blue hover:underline">
              View gallery &rarr;
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {recentPhotos.map((photo, i) => (
              <Reveal key={photo.id} delay={i * 80}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.imageUrl}
                  alt={photo.caption ?? "UNILAG Taekwondo Club"}
                  className="aspect-square w-full rounded-lg object-cover transition-transform duration-300 hover:scale-[1.03]"
                />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {recentAchievements.length > 0 && (
        <section className="bg-zinc-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-brand-red">
                Recent Achievements
              </h2>
              <Link href="/achievements" className="text-sm font-medium text-brand-red hover:underline">
                View all &rarr;
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {recentAchievements.map((a, i) => (
                <Reveal key={a.id} delay={i * 100}>
                  <div className="rounded-xl border border-black/10 bg-white p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-semibold uppercase ${MEDAL_STYLES[a.medal]}`}
                    >
                      {a.medal}
                    </span>
                    <div className="mt-2 font-semibold text-brand-black">{a.athleteName}</div>
                    <div className="text-sm text-zinc-500">{a.competitionName}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {recentInsights.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-brand-blue">
              Latest Insights
            </h2>
            <Link href="/insights" className="text-sm font-medium text-brand-blue hover:underline">
              View all &rarr;
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {recentInsights.map((post, i) => (
              <Reveal key={post.id} delay={i * 100}>
                <Link
                  href={`/insights/${post.slug}`}
                  className="group block overflow-hidden rounded-xl border border-black/10 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  {post.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverImageUrl}
                      alt=""
                      className="aspect-[16/9] w-full object-cover"
                    />
                  )}
                  <div className="p-5">
                    <span className="inline-block rounded-full bg-brand-red/10 px-2 py-1 text-xs font-semibold uppercase text-brand-red">
                      {INSIGHT_CATEGORY_LABELS[post.category]}
                    </span>
                    <h3 className="mt-2 font-semibold text-brand-black group-hover:text-brand-blue">
                      {post.title}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600">{post.excerpt}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
