import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = { title: "Alumni" };

const BENEFITS = [
  "Continue training and grading with the club as an Alumni-Member.",
  "Vote in club matters and stay connected to the UNILAG Taekwondo community.",
  "Compete in non-collegiate open tournaments under the club's banner.",
  "Mentor current student-athletes and support club fundraising/equipment drives.",
];

export default function AlumniPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <span className="text-sm font-semibold uppercase tracking-widest text-brand-blue">
        Once a Member, Always a Member
      </span>
      <h1 className="mt-2 text-3xl font-bold text-brand-black sm:text-4xl">Alumni</h1>
      <p className="mt-4 max-w-2xl text-zinc-600">
        The UNILAG Taekwondo Club community doesn&apos;t end at graduation.
        Former students and graduated athletes can stay active in the club
        as Alumni-Members, continuing to train, grade, and represent the
        UNILAG Taekwondo tradition long after leaving campus.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-2xl border border-black/10 border-t-4 border-t-brand-red p-6">
            <h2 className="font-bold text-brand-black">Alumni-Member Status</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Alumni-Members can train, grade, vote, and compete in
              non-collegiate open tournaments. As with all members, alumni are
              expected to uphold the club&apos;s five tenets and code of
              conduct. Alumni-Members are not eligible to hold executive
              positions, which are reserved for current student-members.
            </p>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div className="h-full rounded-2xl border border-black/10 border-t-4 border-t-brand-blue p-6">
            <h2 className="font-bold text-brand-black">Staying Connected</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Alumni are a vital part of the club&apos;s legacy, from
              mentoring current student-athletes to supporting equipment and
              tournament fundraising. Reach out to the Executive Committee to
              reconnect, or reactivate your membership below.
            </p>
          </div>
        </Reveal>
      </div>

      <div className="mt-16">
        <h2 className="text-xl font-bold text-brand-black">What Alumni Membership Offers</h2>
        <ul className="mt-6 space-y-3">
          {BENEFITS.map((b, i) => (
            <li key={i}>
              <Reveal delay={i * 80} className="flex gap-3 text-sm text-zinc-700">
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-bold text-white ${
                    i % 2 === 0 ? "bg-brand-red" : "bg-brand-blue"
                  }`}
                >
                  {i + 1}
                </span>
                {b}
              </Reveal>
            </li>
          ))}
        </ul>
      </div>

      <Reveal>
        <div className="mt-16 rounded-2xl bg-zinc-50 p-8 text-center">
          <h2 className="text-xl font-bold text-brand-black">Ready to Reconnect?</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Register as an Alumni-Member to reactivate your place in the
            UNILAG Taekwondo Club community.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-full bg-brand-red px-6 py-3 text-sm font-semibold text-white hover:bg-brand-red-dark"
          >
            Register as Alumni-Member
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
