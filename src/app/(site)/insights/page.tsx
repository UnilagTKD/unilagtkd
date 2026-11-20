import { publicMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { getInsightsPage, pageNumber } from "@/lib/public-content";
import { SiteImage } from "@/components/site-image";
import { PublicPagination } from "@/components/public-pagination";
import { notFound } from "next/navigation";


import { Reveal } from "@/components/reveal";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ page?: string }> }): Promise<Metadata> {
  const page = pageNumber((await searchParams).page);
  const result = await getInsightsPage(page);
  if (page > result.pages) notFound();
  return publicMetadata("/insights" + (page > 1 ? "?page=" + page : ""), page > 1 ? { title: "Insights — Page " + page } : {});
}

const CATEGORY_LABELS: Record<string, string> = {
  training: "Training",
  competition: "Competition",
  club_news: "Club News",
  wellness: "Wellness",
};

const CATEGORY_COLORS: Record<string, string> = {
  training: "bg-brand-red/10 text-brand-red",
  competition: "bg-brand-blue/10 text-brand-blue",
  club_news: "bg-zinc-200 text-zinc-700",
  wellness: "bg-brand-blue/10 text-brand-blue",
};

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageNumber((await searchParams).page);
  const { posts, pages } = await getInsightsPage(page);
  if (page > pages) notFound();

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-16 sm:px-6">
      <span className="text-sm font-semibold uppercase tracking-widest text-brand-red">
        From the Dojang
      </span>
      <h1 className="mt-2 text-3xl font-bold text-brand-black sm:text-4xl">Insights</h1>
      <p className="mt-4 max-w-2xl text-zinc-600">
        Training tips, competition recaps, and news from the UNILAG
        Taekwondo Club.
      </p>

      {posts.length === 0 ? (
        <p className="mt-12 text-zinc-500">No posts yet. Check back soon.</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {posts.map((post, i) => (
            <Reveal key={post.id} delay={(i % 4) * 90}>
              <Link
                href={`/insights/${post.slug}`}
                className="group block overflow-hidden rounded-xl border border-black/10 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                {post.coverImageUrl && (
                  <SiteImage
                    src={post.coverImageUrl}
                    alt={post.title}
                    className="aspect-[16/9] h-auto w-full object-cover"
                  />
                )}
                <div className="p-5">
                  <span
                    className={`inline-block rounded-full px-2 py-1 text-xs font-semibold uppercase ${CATEGORY_COLORS[post.category]}`}
                  >
                    {CATEGORY_LABELS[post.category]}
                  </span>
                  <h2 className="mt-2 font-semibold text-brand-black group-hover:text-brand-red">
                    {post.title}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600">{post.excerpt}</p>
                  <div className="mt-3 text-xs text-zinc-400">
                    {post.authorName && <span>{post.authorName} &middot; </span>}
                    {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
      <PublicPagination path="/insights" page={page} pages={pages} />
    </div>
  );
}
