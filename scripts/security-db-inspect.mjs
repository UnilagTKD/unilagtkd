import postgres from 'postgres';
async function main() {
  const local = ['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname);
  const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, ssl: local ? false : 'verify-full' });
  try {
    const role = await db`select current_user as role, rolsuper, rolbypassrls from pg_roles where rolname=current_user`;
    const tables = await db`select c.relname as name, c.relrowsecurity as rls, c.relforcerowsecurity as forced, pg_get_userbyid(c.relowner)=current_user as owned_by_connection from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname`;
    const grants = await db`select grantee, table_name, privilege_type from information_schema.table_privileges where table_schema='public' and grantee in ('PUBLIC','anon','authenticated') order by table_name,grantee`;
    const policies = await db`select tablename, policyname, roles, cmd from pg_policies where schemaname='public'`;
    const transport = await db`select ssl from pg_stat_ssl where pid=pg_backend_pid()`;
    console.log(JSON.stringify({ certificateVerification: !local, role, tables, grants, policies, transport }, null, 2));
  } finally { await db.end(); }
}
main().catch(() => { console.error('Database inspection failed; credentials and driver errors withheld.'); process.exitCode=1; });
