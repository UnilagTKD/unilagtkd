import Link from "next/link";
export function PublicPagination({ path, page, pages }: { path: string; page: number; pages: number }) {
  if (pages <= 1) return null;
  return <nav aria-label="Page navigation" className="mt-10 flex items-center justify-between gap-4 text-sm font-semibold text-brand-blue">
    {page > 1 ? <Link rel="prev" href={page === 2 ? path : `${path}?page=${page - 1}`}>Previous page</Link> : <span />}
    <span className="text-xs font-normal text-zinc-500">Page {page} of {pages}</span>
    {page < pages ? <Link rel="next" href={`${path}?page=${page + 1}`}>Next page</Link> : <span />}
  </nav>;
}
