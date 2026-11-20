# Portal workflow changes — 17 November 2026

## Treasurer logbook

The Treasurer has a **Treasurer logbook** navigation item at `/dashboard/treasury/logbook`. Search by member/email/purpose, filter confirmed payments or unpaid/pending claims, and page through the complete ledger. Each row opens a detailed entry containing the amount, purpose, payment reference, receipt number, grading event if applicable, creation date, most recent claim/decline date, confirmation date, and reviewing officers. Dates use Africa/Lagos. Issued receipts can be opened from the entry.

Only the account holding the Treasurer office can use these pages. The logbook reads the existing dues ledger; it does not create payments or mark claims as paid. It shows the latest claim/review fields retained by that ledger, not an invented history of every earlier edit.

## Readable URLs

Static pages already use descriptive paths, and blog posts keep their existing unique slugs. New links to member profiles, sessions, check-in pages, grading events, receipts, logbook entries, and attendance-period reviews now use readable labels with stable identifiers. For example:

```text
/dashboard/coach/attendance/general-training-<session UUID>
/dashboard/coach/grading/first-semester-grading-<grading UUID>
/dashboard/coach/members/member-name-<member UUID>
/dashboard/receipts/membership-dues-<charge UUID>
/dashboard/treasury/logbook/membership-dues-<charge UUID>
/dashboard/coach/attendance?period=first-semester-<period UUID>
```

Existing UUID-only links remain valid. Names/titles are display labels; authorization still uses the underlying record. Examiner invitations also include a readable grading label, while keeping the same secret, hashed, expiring capability token. Older token-only invitation URLs continue to work. Setup/reset pages keep their descriptive paths and private query tokens. Editing a blog title does not break an existing published slug.

## Attendance periods and archives

Coaches manage batches from **Manage attendance** (`/dashboard/coach/attendance`). Only one monitoring period may be open. Start a named semester/period before creating sessions, and end it before starting another. Complete attendance first: closing freezes the period and cannot be undone from the portal.

Every session belongs to exactly one period. Session creation, editing, deletion, coach marking, member check-in, period changes, and approved-leave review use the same transaction lock where their results can affect archival. Closed sessions are read-only, including through direct server-action requests. The ordinary 24-hour check-in closure still lets a coach correct marks **while the period itself remains open**.

At closure, the portal saves each member's summary, display name/belt, individual marks, and exclusion decisions. Later leave approvals, name/role changes, or a new semester do not rewrite the saved archive. Coaches can reopen the archive for review and inspect a session register or a member's period history. Members can review their own past batches through **My attendance**.

Active-membership, grading, varsity-pool percentages, member dashboards, directories, and grading eligibility all read the active period by default. After it closes, current percentages are empty until a new period has marks; they never silently fall back to lifetime attendance. Percentages continue to use recorded attendance rows, excluding approved leave and sessions before a member joined. Unrecorded sessions are not invented as absences.

Existing sessions were preserved in an open **Imported attendance period** by the migration. Review/close that period normally, then start the next semester. The initial migration does not close an existing period or change any attendance mark. A period's end date cannot precede an attached session or be later than today; resolve scheduled sessions beyond the cutoff before closing.

## Initial passwords after approval

Registration now records the surname explicitly. Admin verifies that surname when approving an application; old pending applications use the existing surname-first full-name format as a starting suggestion that the admin can correct. A newly approved account receives a bcrypt hash of its lowercase surname and can sign in immediately. The member may update the password in Settings. Initial passwords are never logged or returned to the browser as password values.

Existing accounts' passwords were not changed. Old account-setup links remain supported for accounts awaiting their original activation. New approval emails contain login instructions rather than a setup-token link.

## Forgot Password and Resend

The old action only flagged an admin request, even when an email API key was present. It now creates a hashed, single-use reset token with a one-hour expiry and attempts delivery through Resend. A successful send clears the manual-recovery queue entry; a failed/unconfigured send leaves it for admin. The public response stays account-neutral so it does not reveal which emails are registered.

The form now handles errors and always clears its loading state. Provider requests have a 15-second timeout. A configured, verified sender and working outbound DNS/network access are still required. In this workspace, the API key and custom sender were present, but the read-only Resend API diagnostic failed with DNS error `EAI_AGAIN`; actual delivery was **not** verified. No real member was sent a test email. Mocked success/failure and an unknown-address HTTP request are tested separately.

## Migration and checks

`scripts/migrate-portal-features.mjs` applies the three additive SQL files atomically: period/archive storage and the existing-session backfill; surname fields; and the rate-limit table required by the existing production abuse controls. It was applied to the configured database. It preserves existing passwords, roles, and attendance marks. This is separate from the previously unapplied broad security migration.

For another deployment, apply the same migration before starting the new code:

```powershell
node --env-file=.env.local scripts/migrate-portal-features.mjs
npm run build
```

Verification scripts:

```powershell
npm run lint
npx tsx --conditions=react-server --env-file=.env.local scripts/portal-features-check.ts
# Against a temporary local production server at localhost:5215:
npx tsx --env-file=.env.local scripts/portal-http-check.ts
node scripts/security-http-check.mjs
# Read-only email configuration / provider diagnostic:
node --env-file=.env.local scripts/email-config-check.mjs
```

The feature test creates only temporary tables inside a rolled-back transaction. It exercises period creation/closure, archival immutability, later leave changes, zeroed new-period thresholds, surname password hashes, reset email/fallback handling without delivery, and old/readable URL parsing. The HTTP checks use existing accounts to verify coach/member/treasurer boundaries, rendered pages, and record links. The only reset request targets a new, nonexistent `.invalid` address, so no email is sent.
