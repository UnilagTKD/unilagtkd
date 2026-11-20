import { expireTrainingSessions } from "@/lib/training-session-data";
import { sessionHasEnded, sessionExpiresAt } from "@/lib/training-session";
import { SessionExpiryRefresh } from "@/components/dashboard/session-expiry-refresh";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { trainingSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CheckInButton } from "./check-in-button";
import { recordIdFromSlug } from "@/lib/record-slug";

/**
 * Landing page for the QR code on the coach dashboard. Any signed-in member
 * can open it; `selfCheckIn` is what actually enforces who may check in.
 */
export default async function SessionCheckInPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await auth();
  const { sessionId: slug } = await params;
  const sessionId = recordIdFromSlug(slug);
  if (!sessionId) notFound();

  if (!session?.user) {
    redirect("/login");
  }

  await expireTrainingSessions(sessionId);
  const [trainingSession] = await db
    .select()
    .from(trainingSessions)
    .where(eq(trainingSessions.id, sessionId))
    .limit(1);

  if (!trainingSession) notFound();

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-black">{trainingSession.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {trainingSession.date}
          {trainingSession.startTime && ` · ${trainingSession.startTime}–${trainingSession.endTime}`}
          {trainingSession.location && ` · ${trainingSession.location}`}
        </p>
      </div>
      {sessionHasEnded(trainingSession) ? <p className="rounded-lg bg-zinc-100 p-4 text-sm">This session has ended; member check-in is closed. A coach can still record your attendance.</p> : <><SessionExpiryRefresh deadline={sessionExpiresAt(trainingSession).toISOString()} /><CheckInButton sessionId={sessionId} /></>}
    </div>
  );
}
