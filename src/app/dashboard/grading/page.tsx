import Link from "next/link";
import { requireRole } from "@/lib/session";
import { MEMBER_PAGE_ROLES } from "@/lib/roles";
import { db } from "@/db";
import { gradingEvents, gradingCandidates, gradingRequests, dues } from "@/db/schema";
import { and, asc, desc, eq, ne, isNotNull, inArray, gte } from "drizzle-orm";
import {
  checkEligibility,
  gradingOptions,
  rankById,
  rankLabel,
  beltById,
  beltOf,
  criteriaFor,
  OUTCOME_LABELS,
  OUTCOME_STYLES,
  MAX_CRITERION_SCORE,
} from "@/lib/grading";
import { getGradingWindow, loadEligibilityContext } from "@/lib/grading-data";
import { ATTENDANCE_THRESHOLDS } from "@/lib/constants";
import { GradingFees } from "@/components/dashboard/grading-fees";
import { toDateInput } from "@/lib/dates";
import { RequestGradingButton } from "./request-grading-button";
import { WithdrawRequestButton } from "./withdraw-request-button";

export default async function MemberGradingPage() {
  const user = await requireRole([...MEMBER_PAGE_ROLES]);

  const [
    { state: windowState, note: windowNote },
    context,
    history,
    upcoming,
    requests,
    gradingCharges,
    scheduled,
  ] =
    await Promise.all([
      getGradingWindow(),
      loadEligibilityContext(user.id),
      // Only published gradings. Until a panel publishes, a result is provisional
      // and the member sees nothing.
      db
        .select({
          id: gradingCandidates.id,
          fromRank: gradingCandidates.fromRank,
          toBelt: gradingCandidates.toBelt,
          awardedRank: gradingCandidates.awardedRank,
          outcome: gradingCandidates.outcome,
          examinerNotes: gradingCandidates.examinerNotes,
          scoreBasics: gradingCandidates.scoreBasics,
          scorePoomsae: gradingCandidates.scorePoomsae,
          scoreKyorugi: gradingCandidates.scoreKyorugi,
          scoreKyukpa: gradingCandidates.scoreKyukpa,
          scoreHoshinsul: gradingCandidates.scoreHoshinsul,
          scoreTheory: gradingCandidates.scoreTheory,
          gradingTitle: gradingEvents.title,
          gradingDate: gradingEvents.date,
        })
        .from(gradingCandidates)
        .innerJoin(gradingEvents, eq(gradingEvents.id, gradingCandidates.gradingId))
        .where(
          and(
            eq(gradingCandidates.userId, user.id),
            eq(gradingEvents.status, "published")
          )
        )
        .orderBy(desc(gradingEvents.date)),
      // Entered but not yet published - logistics only, no score/outcome shown.
      db
        .select({
          toBelt: gradingCandidates.toBelt,
          gradingId: gradingEvents.id,
          gradingFee: gradingEvents.fee,
          gradingTitle: gradingEvents.title,
          gradingDate: gradingEvents.date,
          gradingLocation: gradingEvents.location,
        })
        .from(gradingCandidates)
        .innerJoin(gradingEvents, eq(gradingEvents.id, gradingCandidates.gradingId))
        .where(
          and(eq(gradingCandidates.userId, user.id), ne(gradingEvents.status, "published"))
        )
        .orderBy(desc(gradingEvents.date)),
      db
        .select()
        .from(gradingRequests)
        .where(eq(gradingRequests.userId, user.id))
        .orderBy(desc(gradingRequests.createdAt)),
      // This member's grading fee charges, so they can see what a grading costs
      // and whether they have settled it without going to the payments page.
      db
        .select({
          gradingId: dues.gradingId,
          amount: dues.amount,
          paid: dues.paid,
          paymentClaimed: dues.paymentClaimed,
          receiptNo: dues.receiptNo,
        })
        .from(dues)
        .where(and(eq(dues.userId, user.id), isNotNull(dues.gradingId))),
      db.select({ id: gradingEvents.id, title: gradingEvents.title, date: gradingEvents.date, fee: gradingEvents.fee })
        .from(gradingEvents)
        .where(and(inArray(gradingEvents.status, ["scheduled", "in_progress"]), gte(gradingEvents.date, toDateInput(new Date()))))
        .orderBy(asc(gradingEvents.date)),
    ]);

  const chargeByGrading = new Map(
    gradingCharges.filter((c) => c.gradingId).map((c) => [c.gradingId as string, c])
  );

  const options = context ? gradingOptions(context) : [];
  const nextUp = options[0];
  const singleVerdict =
    context && nextUp ? checkEligibility({ ...context, target: nextUp.target }) : null;
  const pendingRequest = requests.find((r) => r.status === "pending");
  const lastDecided = !pendingRequest
    ? requests.find((r) => r.status === "declined")
    : undefined;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-black">Grading</h1>
        <p className="text-sm text-zinc-500">
          Your belt progression, what the next rank asks of you, and where you stand against
          it.
        </p>
      </div>

      <div
        className={`rounded-xl border p-5 ${
          windowState.open
            ? "border-green-200 bg-green-50"
            : windowState.phase === "upcoming"
              ? "border-blue-200 bg-blue-50"
              : "border-zinc-200 bg-zinc-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 flex-none rounded-full ${
              windowState.open ? "bg-green-500" : "bg-zinc-400"
            }`}
            aria-hidden
          />
          <span className="font-semibold text-brand-black">
            Grading {windowState.open ? "Open" : "Closed"}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-600">{windowState.label}</p>
        {windowNote && windowState.open && (
          <p className="mt-2 rounded-md bg-white/70 p-3 text-sm text-zinc-700">{windowNote}</p>
        )}
        {!windowState.open && (
          <p className="mt-1 text-xs text-zinc-500">
            Your coaches open a grading period when one is approaching. Keep training in the
            meantime; attendance and time at your current belt are guidance for the coaches.
          </p>
        )}
      </div>

      {pendingRequest && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-yellow-300 bg-yellow-50 p-5">
          <div>
            <div className="font-semibold text-yellow-800">
              Request pending review: {beltById(pendingRequest.targetBeltId)!.name}
            </div>
            <p className="mt-1 text-sm text-yellow-800/80">
              Sent to the coaches. You&apos;ll see their decision here once reviewed.
            </p>
          </div>
          <WithdrawRequestButton requestId={pendingRequest.id} />
        </div>
      )}

      {lastDecided && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="font-semibold text-brand-black">
            Last request declined: {beltById(lastDecided.targetBeltId)!.name}
          </div>
          {lastDecided.reviewNote && (
            <p className="mt-1 text-sm text-zinc-600">{lastDecided.reviewNote}</p>
          )}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="font-semibold text-brand-black">You&apos;re entered for grading</div>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {upcoming.map((u, i) => (
              <li key={i}>
                {u.gradingTitle} · {u.gradingDate}
                {u.gradingLocation && ` · ${u.gradingLocation}`} · testing for{" "}
                {beltById(u.toBelt)!.name}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Grading fee
          </p>
          <ul className="mt-1 space-y-1 text-sm text-zinc-700">
            {upcoming.map((u, i) => {
              const charge = u.gradingId ? chargeByGrading.get(u.gradingId) : undefined;
              if (!charge) {
                return (
                  <li key={i} className="text-zinc-500">
                    {u.gradingTitle} &mdash; no fee has been set for this grading.
                  </li>
                );
              }
              return (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <span>
                    {u.gradingTitle} &mdash; NGN {Number(charge.amount).toLocaleString()}
                  </span>
                  {charge.paid ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Paid{charge.receiptNo ? " \u00b7 " + charge.receiptNo : ""}
                    </span>
                  ) : charge.paymentClaimed ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Awaiting Treasurer confirmation
                    </span>
                  ) : (
                    <Link
                      href="/dashboard/payments"
                      className="rounded-full bg-brand-red px-2.5 py-0.5 text-xs font-semibold text-white hover:bg-brand-red-dark"
                    >
                      Unpaid &mdash; pay now
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-zinc-500">
            Results appear here once the panel publishes them.
          </p>
        </div>
      )}

      {!context ? (
        <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-6 text-sm text-zinc-500">
          Your member profile is not set up yet, so your grading standing cannot be worked out.
          Speak to a coach or the General Secretary.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
            <h2 className="font-semibold text-brand-black">Where You Stand</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-zinc-500">Current Belt</dt>
                <dd className="font-medium text-brand-black">
                  {rankLabel(context.currentRank)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Attendance</dt>
                <dd className="font-medium text-brand-black">
                  {context.attendancePct === null ? "-" : `${context.attendancePct}%`}
                </dd>
                <dd className="text-xs text-zinc-500">
                  {ATTENDANCE_THRESHOLDS.promotionalGrading}% suggested attendance reference
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Outstanding Dues</dt>
                <dd className="font-medium text-brand-black">
                  {context.outstandingDues === 0 ? "None" : context.outstandingDues}
                </dd>
              </div>
            </dl>

            {context.rankInferred && (
              <p className="mt-4 rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
                Your exact grade is not on file, so {rankLabel(context.currentRank)} has been
                assumed from your profile. Tell a coach if that is wrong - it decides which
                rank you would be graded to.
              </p>
            )}
          </div>

          {options.length === 0 ? (
            <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-6 text-sm text-zinc-500">
              You are at the top of the club ladder. Further Dan grades are certified directly
              by Kukkiwon/NTF.
            </div>
          ) : (
            <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
              <h2 className="font-semibold text-brand-black">Your Next Grading</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {windowState.open
                  ? "Grading is open - request the rank you want to be considered for, and a coach will accept or decline it."
                  : "                  This is the current guidance for your next grading. Requesting opens once a grading period starts."}
              </p>

              <div className="mt-4"><GradingFees events={scheduled} /></div>
              <div className="mt-4 space-y-4">
                {options.map((o) => (
                  <div
                    key={o.target.id}
                    className={`rounded-lg border p-4 ${
                      o.eligible ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-brand-black">
                        {o.target.name}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          o.isDouble
                            ? "bg-brand-red/10 text-brand-red"
                            : "bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        {o.isDouble ? "Double grading" : "Next belt"}
                      </span>
                    </div>

                    <div className="mt-2 grid gap-1 text-xs text-zinc-600 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        Poomsae:{" "}
                        <span className="font-medium text-zinc-800">
                          {o.promotion.requiredPoomsae.join(" and ") || "none"}
                        </span>{" "}
                        <Link
                          href="/dashboard/poomsae"
                          className="text-brand-red hover:underline"
                        >
                          (reference footage)
                        </Link>
                      </div>
                      <div className="sm:col-span-2">
                        Suggested criteria:{" "}
                        <span className="font-medium text-zinc-800">
                          {criteriaFor().map((c) => c.label).join(", ")}
                        </span>
                      </div>
                    </div>

                    {o.isDouble && (
                      <p className="mt-2 text-xs text-zinc-600">
                        A double grading covers two ranks in one sitting and includes both
                        ranks&apos; forms. Coaches decide how to assess the result.
                      </p>
                    )}

                    {o.eligible ? (
                      <p className="mt-2 text-xs font-medium text-green-700">
                        No eligibility guidance warnings.
                      </p>
                    ) : (
                      <>
                        <p className="mt-2 text-xs font-medium text-yellow-900">
                          Guidance only. These notes do not prevent a coach from entering or
                          promoting you.
                        </p>
                        <ul className="mt-1 list-inside list-disc text-xs text-zinc-700">
                          {o.blockers.map((b) => (
                            <li key={b.code}>{b.message}</li>
                          ))}
                        </ul>
                      </>
                    )}

                    {windowState.open && !pendingRequest && (
                      <RequestGradingButton targetBeltId={o.target.id} events={scheduled} />
                    )}
                  </div>
                ))}
              </div>

              {singleVerdict && (
                <p className="mt-4 text-xs text-zinc-500">
                  You have held {rankLabel(context.currentRank)} for {singleVerdict.monthsAtRank}{" "}
                  {singleVerdict.monthsAtRank === 1 ? "month" : "months"}.
                </p>
              )}
            </div>
          )}
        </>
      )}

      <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-6">
        <h2 className="font-semibold text-brand-black">Grading History</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            You have not been graded here yet. Results appear once the panel publishes them.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-black/5">
            {history.map((h) => {
              const from = rankById(h.fromRank);
              const toBelt = beltById(h.toBelt);
              const awarded = h.awardedRank ? rankById(h.awardedRank) : null;
              const isDouble = from && toBelt ? toBelt.order - beltOf(from).order > 1 : false;
              const toLabel = awarded ? rankLabel(awarded) : toBelt ? toBelt.name : null;
              const marks = [
                ["Basics", h.scoreBasics],
                ["Poomsae", h.scorePoomsae],
                ["Sparring", h.scoreKyorugi],
                ["Breaking", h.scoreKyukpa],
                ["Self-Defence", h.scoreHoshinsul],
                ["Theory", h.scoreTheory],
              ].filter(([, v]) => v !== null) as [string, number][];

              return (
                <li key={h.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-brand-black">{h.gradingTitle}</div>
                      <div className="text-xs text-zinc-500">
                        {h.gradingDate} ·{" "}
                        {from && toLabel ? `${rankLabel(from)} → ${toLabel}` : "-"}
                        {isDouble && " · double"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${OUTCOME_STYLES[h.outcome]}`}
                      >
                        {OUTCOME_LABELS[h.outcome]}
                      </span>
                    </div>
                  </div>

                  {marks.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
                      {marks.map(([label, value]) => (
                        <span key={label} className="rounded bg-zinc-100 px-2 py-0.5">
                          {label} {value}/{MAX_CRITERION_SCORE}
                        </span>
                      ))}
                    </div>
                  )}

                  {h.examinerNotes && (
                    <p className="mt-2 text-xs text-zinc-600">
                      <span className="font-semibold">Examiner:</span> {h.examinerNotes}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
