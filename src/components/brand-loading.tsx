import { ClubLogo } from "@/components/club-logo";
export function BrandLoading({ fullScreen = false }: { fullScreen?: boolean }) {
  return <div role="status" aria-live="polite" aria-label="Loading UNILAG Taekwondo Club" className={`flex w-full flex-col items-center justify-center gap-5 bg-zinc-50 px-6 py-16 ${fullScreen ? "min-h-screen" : "min-h-[50vh]"}`}>
    <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-sm">
      <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-brand-blue/10 border-t-brand-blue motion-safe:animate-spin" />
      <ClubLogo size={80} preload />
    </div>
    <div className="text-center"><p className="text-sm font-bold tracking-wide text-brand-blue">UNILAG TAEKWONDO CLUB</p><p className="mt-2 text-sm text-zinc-500">Loading, please wait...</p></div>
  </div>;
}
