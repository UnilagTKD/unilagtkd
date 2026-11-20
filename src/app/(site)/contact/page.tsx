import { publicMetadata } from "@/lib/seo";
import { portalHref } from "@/lib/domains";
import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = publicMetadata("/contact");

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[1800px] px-4 py-16 sm:px-6">
      <span className="text-sm font-semibold uppercase tracking-widest text-brand-red">
        Get In Touch
      </span>
      <h1 className="mt-2 text-3xl font-bold text-brand-black sm:text-4xl">Contact Us</h1>
      <p className="mt-4 max-w-2xl text-zinc-600">
        Have a question about training, membership, or partnering with the
        club? Reach out to us, or start your{" "}
        <Link href={portalHref("/register")} className="text-brand-red hover:underline">
          membership application
        </Link>
        .
      </p>

      <div className="mt-10 rounded-xl bg-zinc-50 p-6 text-sm text-zinc-600">
        For membership enquiries, please use the{" "}
        <Link href={portalHref("/register")} className="font-medium text-brand-red hover:underline">
          Membership Registration
        </Link>{" "}
        form instead, it routes your application directly to the Executive
        Committee for review. For everything else, send us a message below.
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <ContactForm />

        <div className="space-y-6">
          <div className="rounded-xl border border-black/10 p-6">
            <div className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Email
            </div>
            <a
              href="mailto:unilagtkd@gmail.com"
              className="mt-1 block font-medium text-brand-black hover:text-brand-red"
            >
              unilagtkd@gmail.com
            </a>
          </div>

          <div className="overflow-hidden rounded-xl border border-black/10">
            <div className="border-b border-black/10 bg-white p-6">
              <div className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Location
              </div>
              <p className="mt-1 font-medium text-brand-black">
                University of Lagos, Akoka, Yaba, Lagos, Nigeria
              </p>
            </div>
            <iframe
              title="UNILAG Taekwondo Club location"
              src="https://www.google.com/maps?q=University+of+Lagos%2C+Akoka%2C+Yaba%2C+Lagos%2C+Nigeria&output=embed"
              className="h-64 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
