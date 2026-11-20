import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import postgres from "postgres";
import { encode } from "next-auth/jwt";
import { recordSlug } from "../src/lib/record-slug";
const base = process.env.CHECK_BASE_URL ?? "http://localhost:5215";
const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, ssl: "verify-full" });
type Account = { id: string; role: string; password_hash: string };
async function session(account: Account) {
  assert.ok(secret);
  const passwordVersion = createHash("sha256").update(account.password_hash).digest("hex");
  return (await Promise.all(["authjs.session-token", "__Secure-authjs.session-token"].map(async name => `${name}=${await encode({ secret: secret!, salt: name, token: { sub: account.id, id: account.id, role: account.role, passwordVersion }, maxAge: 120 })}`))).join("; ");
}
async function page(path: string, account: Account, status = 200) {
  const response = await fetch(new URL(path, base), { headers: { cookie: await session(account) }, redirect: "manual" });
  const html = await response.text();
  if (status === 307 && response.status === 200) {
    assert.match(html, /NEXT_REDIRECT;[^;]+;\/dashboard(?:\/[^;]*)?;307;/, `${path}: streamed authorization redirect`);
    assert.ok(!/<h1[^>]*>Treasurer logbook<\/h1>/.test(html), "Treasury content must not render for unauthorized accounts");
    return html;
  }
  assert.equal(response.status, status, `${path}: expected ${status}, received ${response.status}`);
  return html;
}
async function main() {
  const accounts = await sql<Account[]>`select id,role,password_hash from users where status='active' and password_hash is not null`;
  const coach = accounts.find(account => account.role === "coach");
  const member = accounts.find(account => ["student", "exco", "alumni"].includes(account.role));
  const [treasurer] = await sql<Account[]>`select id,role,password_hash from users where status='active' and password_hash is not null and role in ('exco','admin') and exco_position='treasurer' limit 1`;
  if (coach) {
    assert.ok((await page("/dashboard/coach/attendance", coach)).includes("Attendance periods"));
    assert.ok((await page("/dashboard/attendance", coach)).includes("My attendance"));
    const [profile] = await sql<{ id: string; full_name: string }[]>`select user_id as id,full_name from member_profiles limit 1`;
    if (profile) for (const slug of [profile.id, recordSlug(profile.full_name, profile.id)]) await page(`/dashboard/coach/members/${slug}`, coach);
    const [training] = await sql<{ id: string; title: string }[]>`select id,title from training_sessions limit 1`;
    if (training) for (const slug of [training.id, recordSlug(training.title, training.id)]) await page(`/dashboard/coach/attendance/${slug}`, coach);
    const [grading] = await sql<{ id: string; title: string }[]>`select id,title from grading_events limit 1`;
    if (grading) for (const slug of [grading.id, recordSlug(grading.title, grading.id)]) await page(`/dashboard/coach/grading/${slug}`, coach);
    await page("/dashboard/treasury/logbook", coach, 307);
    console.log("ok coach periods, own attendance, old/readable member/session/grading URLs, and treasury denial");
  }
  if (member) {
    await page("/dashboard/attendance", member);
    await page("/dashboard/coach/attendance", member, 307);
    await page("/dashboard/treasury/logbook", member, 307);
    console.log("ok member attendance access and protected coach/treasury pages");
  }
  if (treasurer) {
    assert.ok((await page("/dashboard/treasury/logbook", treasurer)).includes("Treasurer logbook"));
    const [charge] = await sql<{ id: string; period_label: string }[]>`select id,period_label from dues limit 1`;
    if (charge) assert.ok((await page(`/dashboard/treasury/logbook/${recordSlug(charge.period_label, charge.id)}`, treasurer)).includes("Payment purpose"));
    const [receipt] = await sql<{ id: string; period_label: string }[]>`select id,period_label from dues where paid=true and receipt_no is not null limit 1`;
    if (receipt) for (const slug of [receipt.id, recordSlug(receipt.period_label, receipt.id)]) await page(`/dashboard/receipts/${slug}`, treasurer);
    console.log("ok treasurer logbook, payment details, and old/readable receipt URLs");
  }
  const manifest = JSON.parse(await readFile(".next/server/server-reference-manifest.json", "utf8"));
  const action = Object.entries(manifest.node).find(([, metadata]) => (metadata as { exportedName?: string }).exportedName === "requestPasswordReset");
  assert.ok(action);
  const response = await fetch(new URL("/forgot-password", base), { method: "POST", headers: { "Next-Action": action[0], "Content-Type": "application/json", Accept: "text/x-component", Origin: new URL(base).origin }, body: JSON.stringify([`unknown-${randomUUID()}@feature-check.invalid`]) });
  assert.equal(response.status, 200);
  assert.ok((await response.text()).includes('"ok":true'), "Forgot Password returns a completion result without sending to an unknown address");
  console.log("ok Forgot Password server-action response (unknown address, no email delivery)");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Portal HTTP checks failed"); process.exitCode=1; }).finally(() => sql.end());
