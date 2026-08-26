import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { insights } from "@/db/schema";
import { eq } from "drizzle-orm";

const CATEGORY_LABELS: Record<string, string> = {
  training: "Training",
  competition: "Competition",
  club_news: "Club News",
  wellness: "Wellness",
};

async function getPost(slug: string) {
  const [post] = await db.select().from(insights).where(eq(insights.slug, slug)).limit(1);
  return post ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return { title: post ? post.title : "Insights" };
}

export default async function InsightPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/insights" className="text-sm font-medium text-brand-blue hover:underline">
        &larr; Back to Insights
      </Link>

      <span className="mt-6 inline-block rounded-full bg-brand-red/10 px-2 py-1 text-xs font-semibold uppercase text-brand-red">
        {CATEGORY_LABELS[post.category]}
      </span>
      <h1 className="mt-2 text-3xl font-bold text-brand-black sm:text-4xl">{post.title}</h1>
      <div className="mt-2 text-sm text-zinc-500">
        {post.authorName && <span>{post.authorName} · </span>}
        {new Date(post.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt=""
          className="mt-8 aspect-[16/9] w-full rounded-xl object-cover"
        />
      )}

      <div className="prose prose-zinc mt-8 max-w-none space-y-4 text-zinc-700">
        {post.body.split("\n").filter(Boolean).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
