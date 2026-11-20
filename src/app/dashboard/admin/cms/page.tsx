import { desc } from "drizzle-orm";
import { db } from "@/db";
import { achievements, galleryItems, insights } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { AchievementForm } from "@/components/dashboard/achievement-form";
import { GalleryForm } from "@/components/dashboard/gallery-form";
import { InsightForm } from "@/components/dashboard/insight-form";
import { DeleteAchievementButton } from "@/components/dashboard/delete-achievement-button";
import { DeleteGalleryButton } from "@/components/dashboard/delete-gallery-button";
import { DeleteInsightButton } from "@/components/dashboard/delete-insight-button";

export default async function AdminCmsPage() {
  await requireRole(["admin"]);
  const [awards, photos, posts] = await Promise.all([
    db.select().from(achievements).orderBy(desc(achievements.competitionDate)),
    db.select().from(galleryItems).orderBy(desc(galleryItems.createdAt)),
    db.select().from(insights).orderBy(desc(insights.createdAt)),
  ]);
  return (
    <div className="max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-brand-black">Content management</h1>
        <p className="mt-1 text-sm text-zinc-600">Manage the achievements, gallery photos, and blog posts published on the website.</p>
      </header>
      <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
        <h2 className="mb-4 font-semibold text-brand-black">Achievements</h2>
        <AchievementForm />
        <ul className="mt-6 divide-y divide-black/5">
          {awards.map((award) => (
            <li key={award.id} className="space-y-3 py-4">
              <p className="text-sm">{award.athleteName} — {award.medal}, {award.competitionName} ({award.competitionDate})</p>
              <AchievementForm initial={award} />
              <div><DeleteAchievementButton id={award.id} /></div>
            </li>
          ))}
          {awards.length === 0 && <li className="py-4 text-sm text-zinc-500">No achievements yet.</li>}
        </ul>
      </section>
      <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
        <h2 className="mb-4 font-semibold text-brand-black">Gallery</h2>
        <GalleryForm />
        <ul className="mt-6 divide-y divide-black/5">
          {photos.map((photo) => (
            <li key={photo.id} className="space-y-3 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.imageUrl} alt={photo.caption ?? "Gallery photo"} className="h-36 w-48 rounded-lg object-cover" />
              <p className="text-sm">{photo.caption || "Untitled photo"} — {photo.category}</p>
              <GalleryForm initial={photo} />
              <div><DeleteGalleryButton id={photo.id} /></div>
            </li>
          ))}
          {photos.length === 0 && <li className="py-4 text-sm text-zinc-500">No photos yet.</li>}
        </ul>
      </section>
      <section className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
        <h2 className="mb-4 font-semibold text-brand-black">Insights / Blog</h2>
        <InsightForm />
        <ul className="mt-6 divide-y divide-black/5">
          {posts.map((post) => (
            <li key={post.id} className="space-y-3 py-4">
              <p className="text-sm font-medium">{post.title}</p>
              <InsightForm initial={post} />
              <div><DeleteInsightButton id={post.id} /></div>
            </li>
          ))}
          {posts.length === 0 && <li className="py-4 text-sm text-zinc-500">No posts yet.</li>}
        </ul>
      </section>
    </div>
  );
}
