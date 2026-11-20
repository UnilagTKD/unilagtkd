import { publicMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { getGalleryPage, pageNumber } from "@/lib/public-content";
import { SiteImage } from "@/components/site-image";
import { PublicPagination } from "@/components/public-pagination";
import { notFound } from "next/navigation";


import { Reveal } from "@/components/reveal";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ page?: string }> }): Promise<Metadata> {
  const page = pageNumber((await searchParams).page);
  const result = await getGalleryPage(page);
  if (page > result.pages) notFound();
  return publicMetadata("/gallery" + (page > 1 ? "?page=" + page : ""), page > 1 ? { title: "Gallery — Page " + page } : {});
}

const CATEGORY_LABELS: Record<string, string> = {
  training: "Training",
  demo: "Demonstrations",
  tournament: "Tournaments",
};

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageNumber((await searchParams).page);
  const { photos, pages } = await getGalleryPage(page);
  if (page > pages) notFound();

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-16 sm:px-6">
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
                <SiteImage
                  src={photo.imageUrl}
                  alt={photo.caption ?? "UNILAG Taekwondo Club"}
                  width={800} height={600} sizes="(max-width: 640px) 50vw, 33vw"
                  className="aspect-[4/3] h-auto w-full rounded-lg object-cover transition-transform duration-300 hover:scale-[1.02]"
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
      <PublicPagination path="/gallery" page={page} pages={pages} />
    </div>
  );
}
