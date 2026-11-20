# Security review — 17 November 2026

This review covers the current working tree, including the unfinished portal changes. Code changes are local and have not been deployed. No accounts were created, deleted, or reassigned. This is a code/configuration audit, not a penetration-test certification.

## Deployment gate

**Later workflow update:** the narrower `scripts/migrate-portal-features.mjs` migration has now installed shared rate-limit storage, attendance periods/archives, and surname fields while preserving existing passwords and marks. That resolves the rate-table prerequisite below. The broader token-conversion/RLS migration remains unapplied. See [the current workflow notes](PORTAL-WORKFLOWS.md) for surname initial passwords and automatic reset emails, which supersede the earlier approval/recovery descriptions in this audit.

Production rate limiting requires `security_rate_limits` and fails closed when that store is unavailable. That prerequisite is now installed in the configured database by the additive workflow migration. For another environment, run the workflow migration before rollout. Development uses the existing memory limiter.

Automatic approval review rejected applying `migrations/20261117_security.sql` to the configured remote database because its persistent token, grant, and RLS changes could affect production access. **That broader migration has not run.** It still needs explicit approval and a current recoverable backup. Its remaining legacy-token conversion and existing-table RLS changes are separate from the successfully applied workflow migration; `db:push` is not a substitute for token conversion.

The migration creates the rate-limit table, hashes existing recovery tokens without changing the links people already hold, and adds restrictive, deny-direct-access RLS policies to the application tables. It is transactional. The runner requires a BYPASSRLS/owner connection. After approval:

```powershell
node --env-file=.env.local scripts/migrate-security.mjs
node --env-file=.env.local scripts/security-db-inspect.mjs
```

Keep the application database role private. Its current `neondb_owner` role has BYPASSRLS, so RLS does **not** enforce per-member isolation for this shared backend connection. Server-side roles and ownership predicates remain essential. A future non-owner runtime role and request-scoped identity require a separate, tested database access design; simply enabling FORCE RLS would not fix BYPASSRLS. See [PostgreSQL row-security semantics](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

## Checklist results

| # | Item | Result and evidence |
| --- | --- | --- |
| 1 | Server secrets | Database access is `server-only`; Auth.js and email credentials stay server-side. Removed the browser's unsigned Cloudinary upload path; `src/app/upload-actions.ts` uses private signed credentials when configured. Public domain origins and the Turnstile site key are intentionally public. |
| 2 | Git history | Pattern scan checked 360 historical text blobs: no committed environment files or secret-pattern matches. This is a bounded automated scan, not proof that no unusual credential format ever existed. Added ignores for private keys, certificates, and database dumps. Demo seed passwords now come from a private environment variable and are never printed; seeding requires explicit development opt-in. |
| 3 | Frontend database key | No frontend database SDK, anon key, service-role key, or direct database calls were found. The browser calls server actions. The PostgreSQL owner credential stays in the server environment. |
| 4 | RLS | Prepared in schema and SQL for all 23 tables below; **not applied**. Current metadata showed 22 existing tables without RLS and no PUBLIC/anon/authenticated grants. Policies deny non-bypass direct access; they are not per-user database policies. |
| 5 | Sensitive storage | New setup/reset tokens are SHA-256 digests with a representation prefix; examiner tokens were already hashed. Existing raw tokens await the migration. Medical/contact/profile fields remain readable to the authorized database backend; application-level field encryption has **not** been implemented. Neon documents disk encryption, which does not prevent an authorized SQL query from reading those fields. Review field-level encryption, retention, and key recovery for health data before launch. |
| 6 | Server authentication | Pages use server guards; actions independently verify session/role/office. Auth.js re-reads active status and role from the database. Session password fingerprints now invalidate old sessions after reset/change. |
| 7 | Ownership | Settings, member payment claims, leave cancellation, grading withdrawal, personal forms, and receipts use the session identity or explicit ownership checks. Added ownership/status predicates to withdrawal updates to close check/update races. Coaches/admins/treasurer intentionally access multiple members under their office permissions. Membership approval now locks its application row and creates the account/profile/medical record atomically. |
| 8 | Field allowlists | Profile schema rejects extra fields; CMS parses explicit schemas; role/office/status actions keep their privileged guards. Added strict schemas for charges, payment reports, sessions, announcements, leave, grading windows, candidate registration, and grading requests. Score submissions copy only recognized criteria. |
| 9 | Sessions | Auth.js uses HttpOnly, SameSite=Lax, host-only cookies; Secure is used for HTTPS origins. Explicit eight-hour session maximum. No localStorage/sessionStorage session handling found. Password changes clear recovery tokens and sign the caller out. Deploying the password-fingerprint check also signs out pre-update sessions. |
| 10 | Passwords | bcrypt was already used. New password writes use cost 12 and reject inputs above bcrypt's 72-byte limit; login validates types and byte bounds. No production password logging. |
| 11 | Rate limits | Added shared atomic PostgreSQL buckets, hashed bucket identifiers, global and connection limits, account login/reset limits, password-change limits, member claim/report/request limits, staff-action limits, upload limits, and email budgets. Production activation awaits the migration. `TRUST_PROXY_HEADERS` defaults false: clients share a conservative connection bucket until the hosting proxy's header handling is verified. This does not replace an edge firewall/DDoS limit. |
| 12 | Billing | Code limits email sends to 100/day globally and 5/hour per recipient; upload calls are throttled. Provider billing settings have not been changed. Follow the provider steps below. |
| 13 | Bots | Added a server-checked honeypot to contact/registration and optional Turnstile with server validation of success, action, and allowed hostname. Missing/bad/expired verification fails closed when configured. **Turnstile is not active until both keys are configured.** Honeypots alone are basic protection and can be bypassed by targeted bots. |
| 14 | Queries | Runtime Drizzle/Postgres queries use bound parameters. No user-derived raw SQL or string-built queries found. Migration runner executes a fixed local SQL file, never client input. |
| 15 | Input | Added field lengths, real dates, bounded amounts, UUIDs at common record loaders/actions, bounded scores/notes/attendance batches, and safe image references. DOB now requires guardian details for a minor even if the browser says otherwise. Database UUID/enums and explicit queries also constrain IDs not covered by a dedicated Zod check. |
| 16 | XSS | UI text uses React escaping; no raw HTML renderers/eval found in application source. Escaped names and links in setup/password notification HTML. Production scripts now use per-request CSP nonces rather than unsafe-inline. Inline style attributes remain supported. |
| 17 | Uploads | All photo/signature uploads pass through the app server, with a 2MB cap, PNG/JPEG/WebP allowlist, and file-signature checks. Inline images are revalidated when persisted, including direct form submissions. SVG/HTML/data mismatches are rejected. Images are stored as inert data URLs or Cloudinary images, never executable files in the app. HTTPS URL references are not fetched by our server and cannot be byte-inspected locally; this is not malware scanning. |
| 18 | Response data | Added an application-review DTO excluding recovery tokens and unused fields. Login/session responses expose identity/role rather than database accounts. Coaches' directory and other staff queries select explicit fields. Portal URLs, token links, and public query strings are excluded from analytics. |
| 19 | Webhooks | Not applicable: there are no payment-provider webhooks. Money is reconciled manually by the treasurer. |
| 20 | Prices | Official grading fees are read from server-stored grading events; coaches/treasurer may deliberately set charges through privileged actions. Members' self-reported amounts stay unpaid claims and do not unlock receipts or confirm payment. Added decimal/range validation. No browser-provided amount is treated as proof of payment. |
| 21 | AI injection | Not applicable: no model calls or AI-generated execution pipeline found. |
| 22 | AI quotas | Not applicable: no paid AI feature in the repository. |
| 23 | HTTPS | Configured public/portal origins require HTTPS in production; known HTTP hosts redirect to canonical HTTPS. Recovery links use configured origins, never an arbitrary Host header. PostgreSQL connections now require certificate-validated TLS for remote databases. The read-only connection succeeded; the database's `pg_stat_ssl` view reported false behind its endpoint, so that view alone did not verify end-to-end transport through the provider. DNS/TLS and hosting redirects are not activated by repository changes. |
| 24 | Headers | CSP script nonces/strict-dynamic, frame-ancestors none, X-Frame-Options DENY, nosniff, HSTS, Referrer-Policy, and Permissions-Policy (camera/microphone/location/payment/USB denied). Cross-Origin-Opener-Policy isolates browser windows, DNS prefetch is disabled, and legacy cross-domain policy files are disabled. Portal responses have no-store, no-referrer, and noindex. Nonces require request-time rendering, so public pages are dynamic too. |
| 25 | Production exposure | Explicitly disabled browser source maps and X-Powered-By. Blocked .git/.env/.svn/.hg paths. Production build uses Next's production mode. Do not serve the repository root as a static directory or run `next dev` in production. |
| 26 | Errors | Added generic page/global error fallbacks. Removed application/contact/email logging of raw provider/driver error objects. Next production server actions mask unhandled error details; client catch handlers use generic messages. Hosting access/error-log retention and redaction still need review, especially for recovery/examiner token URLs. |
| 27 | Dependencies | Upgraded Next to 16.4.6, Zod to 4.6.7 and the compatible form resolver, and updated packages within declared ranges. Latest audit: zero production vulnerabilities; full audit has four moderate findings in Drizzle Kit's esbuild dependency chain. npm proposes a breaking downgrade to Drizzle Kit 0.18.1, which was not applied. Other major upgrades (Postgres.js, TypeScript, ESLint, dotenv) were left for compatibility review. |
| 28 | Logs/monitoring | Added structured security events for rate denial/store failure, authorization denial, login success, activation/reset/password changes, office/role/status changes, payment declines, and receipts. Only event names, timestamps, UUID references, and bounded outcomes are logged. No bodies/emails/passwords/tokens are passed to this logger. Events go to server stdout/platform logs; no external monitoring account or alert destination has been configured. |
| 29 | Backups | Provider runbook below. No backup schedule was changed and no restore was performed. `pg_dump` is not installed in this workspace. Production restore readiness remains unverified. |
| 30 | Account 2FA | Owner checklist below. No external account authentication settings were changed. |

Mobile-only items are not applicable: this repository is a Next.js web application, with no native bundle, AsyncStorage, biometrics, or mobile deep-link handlers.

## Prepared RLS table policies

Each listed table has `ENABLE ROW LEVEL SECURITY` and a restrictive `server_only` policy: `FOR ALL TO PUBLIC USING (false) WITH CHECK (false)`. No USING(true) policy is introduced. PUBLIC grants are revoked. Existing non-PUBLIC grants must be reviewed if the database gets other consumers; no such public/anon/authenticated grants were present during inspection.

| Tables | Intended access through the backend |
| --- | --- |
| users | Self session/password reads; admin identity/role/status management; coach appointment checks |
| member_profiles, medical_records | Own forms/settings; authorized coach/admin/welfare workflows |
| applications | Public validated insert; admin membership verification; limited office pipeline summary |
| attendance, training_sessions | Member's own history/check-in; coach training management |
| grading_requests | Own nomination/withdrawal; coach review |
| grading_windows, grading_events, grading_candidates | Member grading display; coach management |
| grading_examiner_invites, grading_examiner_marks | Coach invitations; scoped, expiring examiner token access |
| dues | Own payment history/claims; treasurer reconciliation; authorized finance summaries |
| leave_requests | Own requests; coach review; limited approved-leave welfare view |
| profile_change_requests | Own requests; admin review; coach belt-only review |
| contact_messages | Validated public insert; secretary management; coach/admin inbox |
| achievements, gallery_items, insights | Public read through the server; admin/secretary content management |
| announcements | Audience-filtered member read; authorized office management |
| leadership, sub_committees | Server-rendered public/reference data; controlled seed/administrative operations |
| security_rate_limits | Private backend abuse controls only |

## Provider setup still required

1. **Deployment:** set the origins in `.env.domains.example`, attach both domains, verify TLS certificates and HTTP redirects, and keep cookies host-only. Set `TRUST_PROXY_HEADERS=true` only after confirming that the deployment proxy replaces forwarded IP/protocol headers. With false, limits intentionally use a shared connection bucket.
2. **CAPTCHA:** create a Turnstile widget allowing both domains, set the public site key and server-only secret from `.env.security.example`, rebuild, and test valid, expired, and reused challenges. The verifier follows [Cloudflare's server validation requirements](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
3. **Images:** configure all three private Cloudinary variables for signed hosting or keep inline storage. Disable the old unsigned preset in Cloudinary so its previously public value cannot be reused. [Cloudinary signed upload parameters](https://cloudinary.com/documentation/authentication_signatures) stay on the server. Existing hosted images continue to display. Uploaded membership photos remain accessible to anyone who obtains a public Cloudinary URL; confidential image hosting would need authenticated delivery.
4. **Neon billing:** in the organization billing settings, configure spending notifications with an approved budget and a monitored recipient. Notifications do not constitute a hard spending cap. Review compute autoscaling limits and history-window storage. See [Neon spending notifications](https://neon.com/docs/introduction/spending-notifications).
5. **Resend billing:** review Usage and the billing recipient; keep Transactional Overages disabled if additional billed sending is unwanted. Resend describes quota notifications and opt-in overages in [its billing guidance](https://resend.com/changelog/pay-as-you-go-pricing). The app's own send budget is additional protection after migration.
6. **Cloudinary billing, if used:** review quotas/notifications and the billing email. Cloudinary describes its limits as soft; do not assume crossing a quota automatically stops spend. See [usage guidance](https://cloudinary.com/documentation/programmable_media_asset_usage_data).
7. **Hosting billing, if using Vercel:** set an approved Spend Management budget, alert recipients, and whether to pause production when reached. No deployment provider has been confirmed from this workspace. [Vercel's spend settings](https://vercel.com/docs/spend-management) are relevant only if it is your host.
8. **Monitoring:** retain the structured stdout logs in the host's private log store. Alert on spikes in `authorization_denied`, `office_authorization_denied`, `rate_limit_exceeded`, `rate_limit_store_unavailable`, and `email_send_failed`; redact token query strings and examiner paths from access logs. Configure a private health/uptime check against a public page without logging response bodies. Do not export member data to an analytics service.

### Backups and restore drill

Neon provides instant restore within the configured history window and documents scheduled external `pg_dump` backups in [its backup guide](https://neon.com/docs/postgres/backup-restore/backups). Open the production project's Backup & Restore settings, confirm the actual retention window available on the plan, and choose a recovery point objective with the club owner. For a daily independent backup, use a scheduled runner and private encrypted storage with restricted credentials and retention rules; follow the linked provider guide rather than committing database URLs to workflow files.

Before accepting the setup as complete, restore a chosen backup to an **isolated branch/database**, start the app against that branch, and verify schema, member/profile counts, attendance, dues/receipts, and authorized login. Record the backup timestamp, restore duration, and result in private operations records. Do not restore over the live database during the drill. No schedule or restore can be certified from this audit because the provider console/storage runner was not connected.

Neon documents [AES-256 disk encryption and managed key rotation](https://neon.com/security). That protects stored media, not an attacker who has authorized database access. Field encryption for medical records would need a private key manager, schema/data migration, rotation, backups of key material, and a tested restore process. No encryption key was invented or stored in the repository.

### Owner account two-factor checklist

- Primary email account, because it recovers the other accounts.
- Domain registrar and DNS provider for `unilagtaekwondo.org`.
- Hosting/deployment account and source-code Git provider.
- Neon organization/project owners.
- Resend and Cloudinary administrators, if configured.
- Billing/payment administrator accounts.

Use the provider's supported passkey/security-key or authenticator option, store recovery codes privately, remove obsolete administrators, and verify that another authorized club owner has a recovery route. This checklist is for external owner accounts; it does not add portal-user 2FA.

## Verification

Completed: production build on Next 16.4.6; lint; focused malicious-input/role/CSP/domain checks; read-only HTTP tests for matching per-request script nonces, private dashboard headers, generic forbidden paths, and HttpOnly/SameSite host-only cookies; live-role/session refresh checks; stale-password session rejection; member denial and coach access to the inbox; npm production audit (zero findings). The configured-domain HTTP suite also passed, including HTTPS redirects, secure host-only cookies, preserved queries, static assets, and wrong-host submission rejection. A scan of 48 browser JavaScript files found neither of the two configured private environment values and no browser source maps.

An activated admin account and inactive account were not available for positive admin/inactive-account integration tests. Deleted-account and non-admin rejection were checked. Role helper tests cover admin/coach boundaries without creating accounts.

Not verified: applying the migration, production PostgreSQL limiter behavior under concurrent instances, non-bypass RLS enforcement in an isolated database, real CAPTCHA/provider upload success with private keys, deployed DNS/TLS, provider billing settings, backup scheduling/restore, or external-account 2FA. Those are not claimed complete.

Re-run checks:

```powershell
npm run lint
npm run build
npx tsx scripts/security-check.ts
npx tsx scripts/domain-routing-check.ts
node scripts/security-secrets-check.mjs
node --env-file=.env.local scripts/security-bundle-check.mjs
npm audit --omit=dev
# Against a temporary local server:
node scripts/security-http-check.mjs
$env:CHECK_BASE_URL='http://localhost:5215'
npx tsx --env-file=.env.local scripts/auth-session-check.ts
```
