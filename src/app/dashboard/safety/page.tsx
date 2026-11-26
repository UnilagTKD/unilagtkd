import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SafetyProtocols } from "@/components/safety-protocols";
import { SAFETY_RED_FLAGS } from "@/lib/constants";

export default async function DashboardSafetyPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-brand-black">Injury &amp; Safety</h1>
      <p className="text-sm text-zinc-500">
        What to do when someone gets hurt in the dojang, and in what order.
      </p>

      <div className="mt-6 rounded-xl border border-black/10 bg-white p-5">
        <h2 className="font-bold text-brand-black">How these fit together</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          These are not three alternatives to pick between. They are one timeline.
          <span className="font-semibold text-brand-black"> P.E.A.C.E.</span> covers the
          first few days after a soft-tissue injury, and
          <span className="font-semibold text-brand-black"> L.O.V.E.</span> takes over
          once the acute stage settles and rehabilitation begins &mdash; together they are
          the current sports-medicine standard, published in 2019.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          <span className="font-semibold text-brand-black">R.I.C.E.R.</span> is the older
          model, kept here because it is the vocabulary most coaches were trained on. Note
          that it and P.E.A.C.E. genuinely disagree about ice: RICER says apply it, current
          guidance says do not rely on it. Where they conflict, follow P.E.A.C.E.
        </p>
      </div>

      <div className="mt-6">
        <SafetyProtocols />
      </div>

      <div className="mt-8 rounded-xl border border-brand-red/30 bg-brand-red/5 p-5">
        <h2 className="font-bold text-brand-red">Stop and escalate immediately</h2>
        <p className="mt-2 text-sm text-zinc-700">
          No protocol on this page applies if any of these are present. Send the athlete
          to a clinician the same day.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-zinc-700">
          {SAFETY_RED_FLAGS.map((flag, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 font-bold text-brand-red">!</span>
              <span>{flag}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-zinc-500">
        This page is training guidance for coaches and members. It does not replace
        assessment by a qualified first-aider or medical professional, and nothing here
        should delay getting one.
      </p>
    </div>
  );
}
