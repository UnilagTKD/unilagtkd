import { gradingFeeLabel, type GradingFeeEvent } from "@/lib/grading-fees";

export function GradingFees({ events }: { events: GradingFeeEvent[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
      <h3 className="font-semibold text-brand-black">Grading fees</h3>
      {events.length === 0 ? (
        <p className="mt-1 text-zinc-600">The grading date and fee have not been announced yet. Your coach will confirm them.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {events.map((event) => (
            <li key={event.id} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <span className="min-w-0 break-words">{event.title} <span className="text-xs text-zinc-500">({event.date})</span></span>
              <span className="shrink-0 font-semibold text-brand-black">{gradingFeeLabel(event.fee)}</span>
            </li>
          ))}
        </ul>
      )}
      {events.length > 0 && <p className="mt-2 text-xs text-zinc-500">These are the scheduled event fees. Your coach will confirm your event and any individual fee when reviewing your request.</p>}
    </div>
  );
}
