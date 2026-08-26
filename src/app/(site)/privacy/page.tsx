import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

const LAST_UPDATED = "August 21, 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <span className="text-sm font-semibold uppercase tracking-widest text-brand-red">
        Legal
      </span>
      <h1 className="mt-2 text-3xl font-bold text-brand-black sm:text-4xl">Privacy Policy</h1>
      <p className="mt-4 text-sm text-zinc-500">Last updated: {LAST_UPDATED}</p>

      <div className="prose prose-zinc mt-8 max-w-none space-y-8 text-zinc-700">
        <p>
          This Privacy Policy describes how the UNILAG Taekwondo Club
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;the club&rdquo;)
          collects, uses, and protects your data when you use this website
          and its membership portal.
        </p>

        <section>
          <h2 className="text-xl font-bold text-brand-black">1. Data We Collect</h2>
          <p>We collect the following categories of data:</p>
          <ul className="list-disc pl-6">
            <li>
              <strong>Account data:</strong> email address and a securely
              hashed password, used to log in to your dashboard.
            </li>
            <li>
              <strong>Membership application data:</strong> full name,
              matric/staff number, department, faculty, level, gender, date
              of birth, phone number, residential address, and sub-committee
              preference, collected via the Membership Registration form.
            </li>
            <li>
              <strong>Medical and emergency data:</strong> blood group,
              genotype, allergies, chronic conditions, recent injuries, and
              emergency contact details, collected to keep you safe during
              training and to respond quickly in a medical emergency.
            </li>
            <li>
              <strong>Waiver &amp; consent records:</strong> your liability
              waiver acknowledgements, signature, and date, and (where
              applicable) parent/guardian consent for members under 18.
            </li>
            <li>
              <strong>Club activity data:</strong> training attendance, dues
              and payment records, and competition/achievement results.
            </li>
            <li>
              <strong>Technical data:</strong> IP address and cookies used to
              keep you signed in and to understand basic site usage.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-brand-black">2. Use of Data</h2>
          <p>Collected data is used to:</p>
          <ul className="list-disc pl-6">
            <li>Process and review membership applications;</li>
            <li>Provide and secure access to student, coach, exco, and admin dashboards;</li>
            <li>Track training attendance, dues, and membership status;</li>
            <li>Respond to medical emergencies during club activities;</li>
            <li>Publish achievement and competition results on this website;</li>
            <li>Improve the website and, where enabled, for basic analytics.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-brand-black">3. Data Protection</h2>
          <p>
            We implement technical and organizational measures to protect
            your data, including: passwords stored only as salted
            cryptographic hashes (never in plain text); medical and
            emergency-contact information restricted to coaches, the
            welfare sub-committee, and admins; and role-based access
            controls that limit each dashboard to the data it needs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-brand-black">
            4. Sharing Data with Third Parties
          </h2>
          <p>
            We do not sell or share your data with third parties for
            marketing purposes. Limited disclosure may occur: to University
            of Lagos staff or the University Health Centre in a genuine
            medical emergency; to comply with a legal obligation; or with
            your explicit consent (for example, media/photo use as covered
            by the liability waiver&apos;s media consent clause, which you
            may opt out of in writing at any time).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-brand-black">5. Data Retention</h2>
          <p>
            We retain membership, attendance, and achievement records for as
            long as you remain an active or alumni member and as needed for
            the club&apos;s legitimate administrative and historical
            record-keeping purposes. Rejected applications and their medical
            data are retained only as long as reasonably necessary for
            review purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-brand-black">6. Your Rights</h2>
          <p>
            You may request access to, correction of, or deletion of your
            data by contacting us at{" "}
            <a href="mailto:unilagtkd@gmail.com" className="text-brand-red hover:underline">
              unilagtkd@gmail.com
            </a>
            . If you are under 18, your parent or guardian may exercise
            these rights on your behalf.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-brand-black">7. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please
            contact us at{" "}
            <a href="mailto:unilagtkd@gmail.com" className="text-brand-red hover:underline">
              unilagtkd@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
