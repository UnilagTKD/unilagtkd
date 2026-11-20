import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublicPost } from "@/lib/public-content";
import { publicMetadata, publicUrl, socialImage, SITE_NAME, SITE_ORIGIN } from "@/lib/seo";
import { SiteImage } from "@/components/site-image";
import { StructuredData } from "@/components/structured-data";



const CATEGORY_LABELS: Record<string, string> = {
  training: "Training",
  competition: "Competition",
  club_news: "Club News",
  wellness: "Wellness",
};



export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPost(slug);
  if (!post) notFound();
  return publicMetadata(`/insights/${post.slug}`, { title: post.title, description: post.excerpt, image: post.coverImageUrl, article: true, publishedTime: new Date(post.createdAt).toISOString(), author: post.authorName ?? SITE_NAME });
}

export default async function InsightPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublicPost(slug);

  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/insights" className="text-sm font-medium text-brand-blue hover:underline">
        &larr; Back to Insights
      </Link>

      <StructuredData value={{ "@context": "https://schema.org", "@graph": [
        { "@type": "BlogPosting", headline: post.title, description: post.excerpt, image: socialImage(post.coverImageUrl), datePublished: new Date(post.createdAt).toISOString(), mainEntityOfPage: publicUrl(`/insights/${post.slug}`), author: { "@id": SITE_ORIGIN + "/#organization" }, publisher: { "@id": SITE_ORIGIN + "/#organization" }, creditText: post.authorName ?? SITE_NAME },
        { "@type": "BreadcrumbList", itemListElement: [ { "@type": "ListItem", position: 1, name: "Home", item: publicUrl("/") }, { "@type": "ListItem", position: 2, name: "Insights", item: publicUrl("/insights") }, { "@type": "ListItem", position: 3, name: post.title, item: publicUrl(`/insights/${post.slug}`) } ] },
      ] }} />
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
        <SiteImage preload
          src={post.coverImageUrl}
          alt={post.title}
          className="mt-8 aspect-[16/9] h-auto w-full rounded-xl object-cover"
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
