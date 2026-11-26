import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PoomsaeVideoCards } from "@/components/poomsae-video-cards";
import { KUKKIWON_CHANNEL_URL, KUKKIWON_POOMSAE_PLAYLIST_ID } from "@/lib/constants";

export default async function DashboardPoomsaePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-brand-black">Poomsae</h1>
      <p className="text-sm text-zinc-500">
        All 17 recognized forms, from Taegeuk Il Jang through the black-belt Yudanja
        patterns. Pick a card to play it.
      </p>

      <div className="mt-6">
        <PoomsaeVideoCards />
      </div>

      <p className="mt-6 text-sm text-zinc-500">
        These are public demonstration videos, not Kukkiwon&apos;s own uploads. For
        guaranteed official sourcing, browse Kukkiwon&apos;s{" "}
        <a
          href={`https://www.youtube.com/playlist?list=${KUKKIWON_POOMSAE_PLAYLIST_ID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-blue hover:underline"
        >
          Poomsae playlist &rarr;
        </a>{" "}
        on their{" "}
        <a
          href={KUKKIWON_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-blue hover:underline"
        >
          official YouTube channel
        </a>
        .
      </p>
    </div>
  );
}
