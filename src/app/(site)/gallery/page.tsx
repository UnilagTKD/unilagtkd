import type { Metadata } from "next";
import { db } from "@/db";
import { galleryItems } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = { title: "Gallery" };

const CATEGORY_LABELS: Record<string, string> = {
  training: "Training",
  demo: "Demonstrations",
  tournament: "Tournaments",
};

export default async function GalleryPage() {
  const photos = await db.select().from(galleryItems).orderBy(desc(galleryItems.createdAt));

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <span className="text-sm font-semibold uppercase tracking-widest text-brand-red">
        Lookbook
      </span>
      <h1 className="mt-2 text-3xl font-bold text-brand-black sm:text-4xl">Gallery</h1>
      <p className="mt-4 max-w-2xl text-zinc-600">
        Moments from training sessions, public demonstrations, and tournament
        day.
      </p>

      {photos.length === 0 ? (
        <p className="mt-12 text-zinc-500">No photos have been added yet.</p>
      ) : (
        <div className="mt-10 columns-2 gap-4 sm:columns-3">
          {photos.map((photo, i) => (
            <Reveal key={photo.id} delay={(i % 6) * 70} className="mb-4 break-inside-avoid">
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.imageUrl}
                  alt={photo.caption ?? "UNILAG Taekwondo Club"}
                  className="w-full rounded-lg object-cover transition-transform duration-300 hover:scale-[1.02]"
                />
                <figcaption className="mt-1 text-xs text-zinc-500">
                  {CATEGORY_LABELS[photo.category] ?? photo.category}
                  {photo.caption ? `: ${photo.caption}` : ""}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
