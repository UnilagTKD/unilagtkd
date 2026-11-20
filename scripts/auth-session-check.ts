// Read-only smoke checks against a running production server.
import { randomUUID, createHash } from "node:crypto";
import { encode } from "next-auth/jwt";
import postgres from "postgres";

const baseUrl = process.env.CHECK_BASE_URL ?? "http://localhost:5214";
const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

async function main() {
  if (!secret || !process.env.DATABASE_URL) throw new Error("Auth and database configuration required");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, ssl: "verify-full" });
  async function cookie(id: string, role: string, stalePassword = false) {
    const [account] = await sql<{ password_hash: string | null }[]>`select password_hash from users where id=${id}`;
    const passwordVersion = stalePassword ? "outdated-password" : createHash("sha256").update(account?.password_hash ?? "missing").digest("hex");
    const names = ["authjs.session-token", "__Secure-authjs.session-token"];
    return (await Promise.all(names.map(async (name) =>
      `${name}=${await encode({ secret: secret!, salt: name, token: { sub: id, id, role, passwordVersion }, maxAge: 60 })}`
    ))).join("; ");
  }
  function check(name: string, passed: boolean) {
    if (!passed) throw new Error(`FAIL ${name}`);
    console.log(`ok ${name}`);
  }
  try {
    const anonymous = await fetch(`${baseUrl}/dashboard/admin`, { redirect: "manual" });
    check("anonymous admin access redirects to login", anonymous.status === 307 &&
      (anonymous.headers.get("location") ?? "").includes("/login"));
    const cms = await fetch(`${baseUrl}/dashboard/admin/cms`, { redirect: "manual" });
    check("anonymous CMS access redirects to login", cms.status === 307 &&
      (cms.headers.get("location") ?? "").includes("/login"));
    const invalid = await fetch(`${baseUrl}/examiner/invalid`);
    check("invalid examiner link is rejected", invalid.status === 404);
    const expired = await fetch(`${baseUrl}/examiner/${"0".repeat(64)}`);
    check("unknown examiner token is rejected", expired.status === 404);
    const [account] = await sql<{ id: string; role: string }[]>`
      SELECT id, role FROM users WHERE status = 'active' AND password_hash IS NOT NULL AND role IN ('student', 'alumni', 'exco') LIMIT 1
    `;
    if (account) {
      const headers = { cookie: await cookie(account.id, "admin") };
      const session = await fetch(`${baseUrl}/api/auth/session`, { headers });
      const data = await session.json();
      check("stale token role is replaced by database role", data.user?.role === account.role);
      const access = await fetch(`${baseUrl}/dashboard/admin`, { headers, redirect: "manual" });
      check("stale admin token cannot access administration", access.status === 307 &&
        (access.headers.get("location") ?? "").endsWith(`/dashboard/${account.role}`));
      const cmsAccess = await fetch(`${baseUrl}/dashboard/admin/cms`, { headers, redirect: "manual" });
      check("non-admin cannot access CMS", cmsAccess.status === 307 &&
        (cmsAccess.headers.get("location") ?? "").endsWith(`/dashboard/${account.role}`));
      const messages = await fetch(`${baseUrl}/dashboard/messages`, { headers, redirect: "manual" });
      const deniedInbox = await messages.text();
      // A dashboard loading boundary may stream before the page's role check.
      // Require the redirect and ensure the protected inbox was not rendered.
      const redirected = messages.status === 307 ||
        (messages.status === 200 && /NEXT_REDIRECT;[^;]+;\/dashboard(?:\/[^;]*)?;307;/.test(deniedInbox));
      check("members cannot open the coach/admin inbox", redirected && !/<h1[^>]*>Contact messages<\/h1>/.test(deniedInbox));
      const stale = await fetch(`${baseUrl}/api/auth/session`, { headers: { cookie: await cookie(account.id, account.role, true) } });
      check("sessions with an outdated password version are rejected", !(await stale.json())?.user);
    } else {
      console.log("SKIP role refresh: no activated member account");
    }
    const inboxAccounts = await sql<{ id: string; role: string }[]>`select id,role from users where role in ('coach','admin') and status='active' and password_hash is not null`;
    for (const account of inboxAccounts) {
      const inbox = await fetch(`${baseUrl}/dashboard/messages`, { headers: { cookie: await cookie(account.id, account.role) }, redirect: "manual" });
      check(`${account.role} can view contact messages`, inbox.status === 200);
    }
    const [admin] = await sql<{ id: string; exco_position: string | null }[]>`SELECT id, exco_position FROM users WHERE role='admin' AND status='active' LIMIT 1`;
    if (admin) {
      const headers = { cookie: await cookie(admin.id, "admin") };
      const cms = await fetch(`${baseUrl}/dashboard/admin/cms`, { headers });
      check("admin can open CMS", cms.status === 200 && (await cms.text()).includes("Content management"));
      const settings = await fetch(`${baseUrl}/dashboard/settings`, { headers });
      check("admin can view username in Settings", settings.status === 200 && (await settings.text()).includes("Username"));
      if (admin.exco_position === "general_secretary") {
        const office = await fetch(`${baseUrl}/dashboard/exco`, { headers });
        check("admin Secretary can open office dashboard", office.status === 200 && (await office.text()).includes("General Secretary"));
      }
    }
    const deleted = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { cookie: await cookie(randomUUID(), "admin") },
    });
    check("deleted account session is rejected", !(await deleted.json())?.user);
    const [inactive] = await sql<{ id: string }[]>`SELECT id FROM users WHERE status = 'inactive' LIMIT 1`;
    if (inactive) {
      const response = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { cookie: await cookie(inactive.id, "admin") },
      });
      check("inactive account session is rejected", !(await response.json())?.user);
    } else {
      console.log("SKIP inactive session: no inactive account");
    }
  } finally {
    await sql.end();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Smoke checks failed");
  process.exitCode = 1;
});
