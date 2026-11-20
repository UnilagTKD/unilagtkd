This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

See [SEO and performance](docs/SEO-PERFORMANCE.md) for metadata, crawl rules, caching, optimized images, and verification commands.

Monthly summaries: `/dashboard/reports` is available to the president, coaches, and admin. It previews completed months in Lagos time, archives the first sent snapshot, automatically selects active president/coach email addresses, and supports up to 10 extra recipient emails. Extra recipients receive aggregate figures only and are not granted portal access. Manual send/retry skips recipients already submitted for that month's report. `vercel.json` checks daily at 08:00 UTC (09:00 Lagos) for the previous month's report, so the first check after month-end sends it and later checks retry failed submissions. Deploy the schedule and set a private `CRON_SECRET` in the hosting environment to activate automation; local development does not run a hosted schedule. The local secret is configured in the ignored `.env.local`. See [Vercel's scheduler authorization guidance](https://vercel.com/docs/schedules/cron-jobs/manage-cron-jobs).

New membership applications now finish with **₦5,000 semester dues**, the shared PalmPay payment instructions, a payment reference, and a private PNG/JPEG/WebP receipt image under 1MB. Admin or the treasurer sets the semester name and confirms/declines claims at `/dashboard/treasury/admissions`. Admin approval is blocked until the actual payment is confirmed by admin or treasurer. Admin can perform both steps without a treasurer account. Approval creates one paid semester-dues ledger entry, preserving the reviewer's confirmation date; existing accounts and historical approvals are not backfilled or charged. Receipt uploads stay in the private database, not the public image host. A 30-day private tracking link lets pending applicants check progress and replace declined receipts. Receipt downloads require treasurer/admin access and are never publicly cached. Password/setup tokens and tracking hashes are not exposed to the review components.

Apply `node --env-file=.env.local scripts/migrate-reports-admission.mjs` in other environments before rollout. The new columns/settings/report tables do not alter existing account roles or approvals. Run `scripts/workflow-e2e.mjs` with `REPORT_ADMISSION_CHECK=true`, `MOCK_WORKFLOW_EMAIL=true`, and `WORKFLOW_TEST_EMAIL` set to an authorized recipient to verify the receipt/approval/report flows in an isolated schema without sending live email. `scripts/report-period-check.ts` checks Lagos month boundaries and leap years.

Portal notifications live at `/dashboard/notifications`, with unread counts in every role's menu. Requests alert the appropriate reviewers; account/role/office changes, profile and leave decisions, payment charges/decisions/receipts, grading request decisions, and published grading results notify affected accounts. Contact messages alert coaches/admins. Approval emails retain their existing login instructions; applicants without an account receive rejection updates by email only. Existing activities are not backfilled.

Apply `node --env-file=.env.local scripts/migrate-notifications.mjs` in each deployment before using this version. This adds only the notifications table, indexes, and restrictive RLS policy. Notifications and email submission status are stored separately: provider failures leave the portal notification available, with an owner-only retry. A sent status means provider submission, not confirmed inbox receipt. Delivery claims prevent concurrent retries; stale claims can be retried after five minutes. Resend idempotency keys additionally suppress repeated provider submissions within its [24-hour retention window](https://resend.com/changelog/idempotency-keys). Existing email quotas still apply. Emails do not include medical details or private review notes.

Routine notification emails have a separate per-recipient allowance from security emails so they cannot consume password-reset allowances. Notifications are capped at 90 daily submissions within the existing overall cap of 100, leaving room for security emails. Failed and limited notifications can be retried from the inbox. Accounts using demo addresses cannot receive email; use a real address when creating the coach's permanent account.

Run `scripts/workflow-e2e.mjs` with `NOTIFICATION_CHECK=true` and `WORKFLOW_TEST_EMAIL` set to an authorized recipient for isolated notification/ownership/retry tests. The email provider is mocked in that test process; no test emails are delivered and all temporary data is removed. Set `MOCK_WORKFLOW_EMAIL=true` to mock delivery during the full workflow suite as well.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:5213](http://localhost:5213) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Admin access

Admin pages require an account explicitly assigned the admin role. No account is created or promoted automatically. Admins verify membership, profile changes, and account recovery. Coaches can also approve belt-only requests. Registration payment verification is available to admin and the Treasurer; other payment verification remains with the Treasurer, leave approval remains with coaches, and Exco appointments can be made by admin or coaches.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Admin and examiner database update

For an existing database, run `npx tsx --env-file=.env.local scripts/migrate-admin-examiner.ts` before using administration or examiner invitations. This additive, transactional migration adds the admin role and examiner tables without removing existing data. Run `npx tsx --env-file=.env.local scripts/schema-drift.ts` to check table and column readiness.

Coach invitations expire after seven days. Creating a replacement link revokes previous links for that grading; publishing or cancelling the grading closes examiner access. Examiner marks remain separate from the coach's manual final decision.

Account role and status changes are checked on authenticated requests, including dashboard routing, so existing sessions reflect admin changes.
For local production smoke checks, start `next start -p 5214` with `AUTH_TRUST_HOST=true` and `AUTH_URL=http://localhost:5214`, then run `npx tsx --env-file=.env.local scripts/auth-session-check.ts`. Set `CHECK_BASE_URL` if using another port. The checks read existing accounts, use short-lived test sessions, and make no database changes. Configure the deployed authentication URL and trusted host for your hosting environment as well.

Admins can manage achievements, gallery photos, and blog posts at /dashboard/admin/cms through the Content management navigation item. Existing entries can be edited or deleted; editing a blog post preserves its public URL. Authorized Exco officers retain their content permissions.


An admin account can also hold an Exco office; its office dashboard and permissions remain available. Usernames are assigned during registration and shown as read-only in Settings. Registration accepts an optional username (3-30 letters, numbers, or underscores), which is copied to the account on approval. Existing databases need the additive SQL in migrations/20261117_application_username.sql before using registration usernames.


Profile changes: Settings supports contact/belt updates and verified membership-category or academic changes, including department/course, faculty, matric/staff number, level, graduation year, institution, and occupation. Academic changes require relevant category details, an explanation, and explicit confirmation, followed by admin approval. Coaches may approve belt-only requests. Full name and username remain fixed. Requests preserve before/after values and review history; conflicting changes require a fresh request. Approved category changes preserve coach/admin/Exco privileges and offices. Registration offers Student (undergraduate/postgraduate), Alumni, Non-student, and Staff options with relevant fields. Apply `scripts/migrate-profile-requests.ts` and `node --env-file=.env.local scripts/migrate-membership-changes.mjs` in other environments before rollout. Public navigation, hero, and main sections use wider desktop containers with mobile padding preserved.


Training sessions close member check-in automatically 24 hours after the scheduled start in Africa/Lagos (midnight on the date when no start time is set). Closure is enforced from the time window on each check-in, with the effective ended_at persisted when the session is accessed. Coaches can still record or correct attendance after either automatic or manual closure.

Coaches can use the Members navigation item to search the directory and open full profiles, pictures, leave history, attendance, emergency contacts, and training safety information. Coach profile belt requests are limited to Black Belt, 1st through 9th Dan, and continue through the profile approval workflow.


Treasury claim review: open Review payment on the Treasurer dashboard to confirm a payment or decline a pending claim with a reason. A declined claim remains unpaid, records its reviewer and time, and can be corrected and resubmitted by the member. Paid or receipted claims cannot be declined. Existing databases need npx tsx --env-file=.env.local scripts/migrate-payment-claim-declines.ts before enabling this flow.

Only the account holding the Treasurer office can upload its receipt signature in Settings under Receipt signature. This separate receipt setting saves immediately and does not create a member profile change request. Signature images must be under 2MB. The Server Action body limit is 5MB to accommodate a registration photograph plus its private receipt; receipt images are limited to 1MB.


Admin verification pages: /dashboard/admin/verifications. Coach Exco appointment page: /dashboard/coach/exco. No replacement admin account is provisioned by this change.

Coaches can grant admin access to another active registered account at `/dashboard/coach/admins`. The confirmation explains that this replaces the account's current role; its existing Exco office is retained. Self-appointment is blocked, existing sessions pick up the new role, and successful appointments are logged. General role editing remains admin-only. Run `scripts/workflow-e2e.mjs` with `ADMIN_APPOINTMENT_CHECK=true` and `WORKFLOW_TEST_EMAIL` set to an authorized test recipient to exercise this flow in an isolated schema without sending emails.


Coaches also have access to all shared member pages: payments, membership form, waiver, resources, terminology, poomsae, safety, personal grading, leave, and settings. The Coach Dashboard shows coaching tools; shared member pages remain available in the menu. Coach leave requests must be reviewed by another coach.

## Public website and portal domains

Attach both domains to the same deployed Next.js app in your hosting provider:

- Public website: `https://unilagtaekwondo.org`
- Portal: `https://portal.unilagtaekwondo.org`

Set the values in `.env.domains.example` in the deployment environment **before building**. `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_PORTAL_URL` are included in the browser build. Set `AUTH_URL` to the portal origin; keep `AUTH_SECRET` private and stable. Leave the domain variables unset during local development or on preview deployments that should use a single origin.

The portal contains login, registration, account setup/recovery, dashboards, and examiner links. Its root opens the dashboard (or login when signed out). Public pages opened on the portal return to the public website. Portal paths opened on the public domain redirect to the portal, retaining query parameters. Incorrect-host form submissions are rejected rather than forwarded across origins. Authentication uses the portal's normal host-only session cookie; there is no shared parent-domain cookie.

Public login/join links, dashboard links, Back to site links, invitation/setup links, and attendance QR codes use the configured origins. `scripts/domain-routing-check.ts` verifies the routing rules and callback restrictions. DNS records, domain attachment, and TLS certificates must be configured with your DNS/hosting providers; repository changes do not activate the domains.

For an HTTP smoke check without changing DNS, build with the domain values above, start the production server locally on port 5215 with the same values and `TRUST_PROXY_HEADERS=true`, then run `node scripts/domain-host-check.mjs`. This emulates a trusted TLS proxy using raw local HTTP requests and Host/forwarded-protocol headers, never follows redirects to the live domains, and makes no account or DNS changes. Run `npx tsx scripts/domain-routing-check.ts` for the pure routing checks.

## Security review and deployment gate

The latest [portal workflows](docs/PORTAL-WORKFLOWS.md) cover the Treasurer logbook, readable record URLs, archived attendance periods with active-period-only thresholds, surname-based initial passwords for newly approved accounts, and automatic emailed password recovery. The additive migration for these features has been applied to the configured database; run `node --env-file=.env.local scripts/migrate-portal-features.mjs` for other environments before rollout. It also creates shared rate-limit storage, so that prerequisite no longer depends on the broad security migration below.

Exco appointments allow at most two assigned accounts per position, including inactive accounts until their appointment is removed. Coaches and admins see occupancy counts and unavailable full positions. Changes are serialized in a PostgreSQL transaction to prevent concurrent appointments from exceeding capacity. The result popup shows the member, previous/new position, and any automatic member-to-Exco role change. No existing appointments are automatically removed. Run `npx tsx scripts/exco-capacity-check.ts` for boundary checks and `node --env-file=.env.local scripts/exco-lock-check.mjs` for the read-only lock/occupancy check.

Read [the security review](docs/SECURITY-REVIEW.md) before deployment. The broader `migrations/20261117_security.sql` remains unapplied; the additive workflow migration above has already created the shared rate-limit table in the configured database. Apply the workflow migration in other environments before rollout. `.env.security.example` documents optional CAPTCHA and signed upload settings. Provider billing alerts, backups/restore verification, external-account 2FA, and application-level medical-field encryption remain operator work. No accounts were created or deleted during this audit.
