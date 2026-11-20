import Image from "next/image";
const OPTIMIZED_HOSTS = new Set(["res.cloudinary.com", "picsum.photos", "fastly.picsum.photos", "images.unsplash.com"]);
function optimizable(src: string) {
  if (/^\/(?!\/)/.test(src)) return !src.toLowerCase().endsWith(".svg");
  try { const url = new URL(src); return url.protocol === "https:" && OPTIMIZED_HOSTS.has(url.hostname); } catch { return false; }
}
export function SiteImage({ src, alt, className, sizes = "(max-width: 640px) 100vw, 50vw", preload = false, fill = false, width = 1200, height = 675 }: {
  src: string; alt: string; className?: string; sizes?: string; preload?: boolean; fill?: boolean; width?: number; height?: number;
}) {
  return <Image src={src} alt={alt} className={className} sizes={sizes} preload={preload} fill={fill}
    width={fill ? undefined : width} height={fill ? undefined : height}
    loading={preload ? undefined : "lazy"} decoding="async" unoptimized={!optimizable(src)} />;
}
