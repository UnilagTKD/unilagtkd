// Runs real Server Actions against an empty, isolated schema. Existing public
// tables are read only for structure; no member records are copied or changed.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import postgres from 'postgres';
import { hash } from 'bcryptjs';
import { encode } from 'next-auth/jwt';
const schema = 'workflow_check_' + randomUUID().replaceAll('-', '');
assert.match(schema, /^workflow_check_[a-f0-9]{32}$/);
const base = 'http://localhost:5215';
const recipient = process.env.WORKFLOW_TEST_EMAIL;
assert.ok(recipient && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient), 'Set WORKFLOW_TEST_EMAIL to an authorized test recipient');
const owner = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: 'verify-full', onnotice() {} });
let sql, server, created = false;
const checks = [];
const mockLog = fileURLToPath(new URL('../.next/notification-emails-' + randomUUID() + '.jsonl', import.meta.url));
const mockFailure = mockLog + '.fail';
const roleByCookie = new Map();
let gradingPath = '';
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const date = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const protection = { website: '', token: '' };
function passed(message) { checks.push(message); console.log('ok ' + message); }
const manifest = JSON.parse(await readFile('.next/server/server-reference-manifest.json', 'utf8'));
function actionId(name, cookie) {
  const entry = Object.entries(manifest.node).find(([, value]) => value.exportedName === name);
  assert.ok(entry, `Server action ${name} must exist in the build`);
  const workers = Object.keys(entry[1].workers);
  const role = roleByCookie.get(cookie);
  const worker = workers.find(worker => role && worker.startsWith('app/dashboard/' + role + '/')) || workers[0];
  const path = worker.replace(/^app/, '').replace(/\/\([^/]+\)/g, '').replace(/\/page$/, '') || '/';
  return { id: entry[0], path };
}
async function action(name, args, cookie = '', reject = false) {
  const target = actionId(name, cookie);
  let path = target.path.includes('[gradingId]') && gradingPath ? gradingPath : target.path;
  if (path.includes('[sessionId]') && typeof args[0] === 'string' && /^[a-f\d-]{36}$/i.test(args[0])) path = path.replace('[sessionId]', args[0]);
  const response = await fetch(base + path, { method: 'POST', redirect: 'manual', headers: {
    'Next-Action': target.id, 'Content-Type': 'application/json', Accept: 'text/x-component', Origin: base, cookie,
  }, body: JSON.stringify(args), signal: AbortSignal.timeout(45000) });
  const body = await response.text();
  const failure = response.status >= 300 || /^\w+:E\{/m.test(body);
  const records = new Map();
  for (const match of body.matchAll(/^([a-f\d]+):([^\n]+)$/gm)) { try { records.set(match[1], JSON.parse(match[2])); } catch {} }
  const pointer = records.get('0')?.a?.match?.(/^\$@([a-f\d]+)$/)?.[1];
  const value = pointer ? records.get(pointer) : undefined;
  if (reject) {
    assert.ok(failure || value?.ok === false, `${name}: rejected operation was accepted`); return;
  }
  assert.ok(!failure, `${name}: action failed (HTTP ${response.status}); inspect local server logs`);
  return { value, response };
}
async function cookieFor(account) {
  const [row] = await sql`select password_hash from users where id=${account.id}`;
  const passwordVersion = createHash('sha256').update(row.password_hash).digest('hex');
  const name = 'authjs.session-token';
  return name + '=' + await encode({ secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET, salt: name, token: { sub: account.id, id: account.id, role: account.role, passwordVersion }, maxAge: 900 });
}
async function account(role, position = null) {
  const [row] = await sql`insert into users (email,role,password_hash,status,exco_position,created_at) values (${randomUUID() + '@workflow.invalid'},${role},${await hash(randomUUID(), 12)},'active',${position},'2020-01-01') returning id,role`;
  await sql`insert into member_profiles (user_id,full_name,surname,membership_category,belt_grade,phone,level_year,address) values (${row.id},${'Workflow ' + role},'Workflowtest','undergraduate',${role === 'coach' ? 'Black Belt 1st Dan' : 'White Belt 10th Geup'},'08000000000','100','Test address Lagos')`;
  const cookie = await cookieFor(row);
  roleByCookie.set(cookie, role);
  return { ...row, cookie };
}
async function page(path, cookie, status = 200) {
  const response = await fetch(base + path, { headers: { cookie }, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, status, path);
  return response.text();
}
async function run() {
  // Reject sequence defaults before cloning so a clone cannot advance a live sequence.
  const sequences = await owner`select 1 from information_schema.columns where table_schema='public' and column_default like '%nextval(%' limit 1`;
  assert.equal(sequences.length, 0, 'Sequence defaults need independent clones before this test can run');
  const tables = await owner`select tablename from pg_tables where schemaname='public'`;
  assert.ok(tables.some(table => table.tablename === 'users'));
  await owner`create schema ${owner(schema)}`;
  created = true;
  for (const { tablename } of tables) await owner`create table ${owner(schema)}.${owner(tablename)} (like public.${owner(tablename)} including all)`;
  const isolatedUrl = new URL(process.env.DATABASE_URL);
  // Neon transaction poolers reject per-connection search_path options. Use
  // the same database's direct endpoint for an isolated, stable search_path.
  if (isolatedUrl.hostname.endsWith('.neon.tech')) isolatedUrl.hostname = isolatedUrl.hostname.replace('-pooler.', '.');
  isolatedUrl.searchParams.set('options', ((isolatedUrl.searchParams.get('options') || '') + ' -c search_path=' + schema).trim());
  sql = postgres(isolatedUrl.href, { max: 1, prepare: false, ssl: 'verify-full', onnotice() {} });
  const [isolation] = await sql`select current_schema() as schema, (select count(*)::int from users) as users`;
  assert.equal(isolation.schema, schema); assert.equal(isolation.users, 0);
  passed('isolated empty schema; no existing users copied');
  const admin = await account('admin'), coach = await account('coach'), treasurer = await account('exco', 'treasurer');
  let secretary, president;
  async function approveProfile(requestId) {
    secretary ??= await account('exco', 'general_secretary');
    president ??= await account('exco', 'president');
    await action('reviewProfileChange', [requestId, 'admin', 'approved'], coach.cookie, true);
    for (const [stage, reviewer] of [['coach', coach], ['general_secretary', secretary], ['president', president]]) {
      assert.equal((await action('reviewProfileChange', [requestId, stage, 'approved'], reviewer.cookie)).value?.ok, true);
      assert.equal((await sql`select status from profile_change_requests where id=${requestId}`)[0].status, 'pending');
    }
    assert.equal((await action('reviewProfileChange', [requestId, 'admin', 'approved'], admin.cookie)).value?.ok, true);
    assert.equal((await sql`select status from profile_change_requests where id=${requestId}`)[0].status, 'approved');
  }
  const committees = [];
  for (const name of ['Test welfare', 'Test media', 'Test technical']) committees.push((await sql`insert into sub_committees (name) values (${name}) returning id`)[0].id);
  const env = { ...process.env, DATABASE_URL: isolatedUrl.href, AUTH_URL: base, NEXTAUTH_URL: base, AUTH_TRUST_HOST: 'true', NEXT_PUBLIC_SITE_URL: '', NEXT_PUBLIC_PORTAL_URL: '', TURNSTILE_SECRET_KEY: '', NEXT_PUBLIC_TURNSTILE_SITE_KEY: '' };
  if (process.env.NOTIFICATION_CHECK === 'true' || process.env.MOCK_WORKFLOW_EMAIL === 'true') {
    env.NODE_OPTIONS = (env.NODE_OPTIONS || '') + ' --require "' + fileURLToPath(new URL('./mock-email-provider.cjs', import.meta.url)).replaceAll('\\', '/') + '"';
    env.MOCK_EMAIL_LOG = mockLog; env.MOCK_EMAIL_FAILURE_FILE = mockFailure;
    env.RESEND_API_KEY = 'isolated-notification-test-key';
  }
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '5215'], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stderr.on('data', chunk => {
    const output = chunk.toString();
    if (output.includes('EADDRINUSE')) console.error('Test port already in use');
    if (output.includes('Cannot find module') || output.includes('SyntaxError')) console.error(output.slice(0, 1200));
    // Do not print provider credentials, SQL, member data, or session cookies.
  });
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { const response = await fetch(base + '/api/auth/session'); if (response.ok) { ready = true; break; } } catch {}
    if (server.exitCode !== null) throw new Error('Temporary server exited before becoming ready');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, 'Isolated app must start');
  // Verify the running app really uses the cloned schema before any mutation.
  const session = await (await fetch(base + '/api/auth/session', { headers: { cookie: admin.cookie } })).json();
  assert.equal(session.user?.id, admin.id); assert.equal(session.user?.role, 'admin');
  if (process.env.NOTIFICATION_CHECK === 'true') {
    const member = await account('student'), other = await account('student');
    const beforeCount = async userId => (await sql`select count(*)::int as n from notifications where user_id=${userId}`)[0].n;
    await action('appointAdmin', [member.id], other.cookie, true);
    assert.equal(await beforeCount(member.id), 0, 'Rejected action does not notify');
    await action('appointAdmin', [member.id], coach.cookie);
    const [item] = await sql`select * from notifications where user_id=${member.id}`;
    assert.equal(item.email_status, 'sent');
    await action('appointAdmin', [member.id], coach.cookie);
    assert.equal(await beforeCount(member.id), 1, 'No-op appointment must not duplicate');
    assert.ok((await page('/dashboard/notifications', member.cookie)).includes('Account access updated'));
    assert.ok(!(await page('/dashboard/notifications', other.cookie)).includes('Account access updated'));
    await action('readNotification', [item.id], other.cookie);
    assert.equal((await sql`select read_at from notifications where id=${item.id}`)[0].read_at, null);
    await action('readNotification', [item.id], member.cookie);
    assert.ok((await sql`select read_at from notifications where id=${item.id}`)[0].read_at);
    const sent = (await readFile(mockLog, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.equal(sent.length, 1); assert.equal(sent[0].replyTo, 'unilagtkd@gmail.com');
    assert.ok(sent[0].idempotencyKey); assert.ok(sent[0].html.includes('/brand/club-logo.png'));
    await writeFile(mockFailure, 'fail');
    await action('updateExcoPosition', [other.id, 'welfare_officer'], coach.cookie);
    const [failed] = await sql`select * from notifications where user_id=${other.id}`;
    assert.equal(failed.email_status, 'failed', 'Provider failure retains portal notification');
    await unlink(mockFailure);
    await action('retryNotificationEmail', [failed.id], member.cookie);
    assert.equal((await sql`select email_attempts from notifications where id=${failed.id}`)[0].email_attempts, 1, 'Cannot retry another account email');
    await action('retryNotificationEmail', [failed.id], other.cookie);
    const [retried] = await sql`select * from notifications where id=${failed.id}`;
    assert.equal(retried.email_status, 'sent'); assert.equal(retried.email_attempts, 2);
    await action('retryNotificationEmail', [failed.id], other.cookie);
    assert.equal((await sql`select email_attempts from notifications where id=${failed.id}`)[0].email_attempts, 2);
    for (const role of ['student', 'alumni', 'student', 'alumni']) await action('updateUserRole', [other.id, role], member.cookie);
    assert.ok((await sql`select id from notifications where user_id=${other.id} and email_status='failed'`).length > 0, 'Notification email limit leaves retryable records');
    const [target] = await sql`select email from users where id=${other.id}`;
    await action('requestPasswordReset', [target.email]);
    assert.equal((await sql`select reset_requested_at from users where id=${other.id}`)[0].reset_requested_at, null, 'Notification limits must not block password-reset email');
    await action('createDuesCharge', [{ userId: other.id, periodLabel: 'Notification single charge', amount: '500.00' }], treasurer.cookie);
    const bulk = (await action('createDuesCharge', [{ userId: '__all__', periodLabel: 'Notification bulk charge', amount: '500.00' }], treasurer.cookie)).value;
    assert.ok(bulk.charged > 0);
    const beforeRepeat = await beforeCount(other.id);
    assert.equal((await action('createDuesCharge', [{ userId: '__all__', periodLabel: 'Notification bulk charge', amount: '500.00' }], treasurer.cookie)).value.charged, 0);
    assert.equal(await beforeCount(other.id), beforeRepeat, 'Skipped bulk charges must not notify again');
    assert.equal((await sql`select count(*)::int as n from notifications where user_id=${other.id} and title='New payment charge'`)[0].n, 2);
    passed('notifications: successful actions only, inbox isolation, owner-only read/retry, no duplicate, email failure recovery, branded reply-to email');
    return;
  }
  if (process.env.ADMIN_APPOINTMENT_CHECK === 'true') {
    const member = await account('student');
    const secretary = await account('exco', 'general_secretary');
    const inactive = await account('student');
    await sql`update users set status='inactive' where id=${inactive.id}`;
    assert.ok((await page('/dashboard/coach/admins', coach.cookie)).includes('Admin appointments'));
    await page('/dashboard/coach/admins', member.cookie, 307);
    await action('appointAdmin', [member.id], member.cookie, true);
    await action('appointAdmin', [coach.id], coach.cookie, true);
    await action('appointAdmin', [inactive.id], coach.cookie, true);
    await action('appointAdmin', [randomUUID()], coach.cookie, true);
    assert.equal((await action('appointAdmin', [member.id], coach.cookie)).value?.changed, true);
    const updated = await (await fetch(base + '/api/auth/session', { headers: { cookie: member.cookie } })).json();
    assert.equal(updated.user?.role, 'admin', 'Existing sessions refresh their database role');
    assert.ok((await page('/dashboard/admin', member.cookie)).includes('Administration'));
    assert.equal((await action('appointAdmin', [member.id], coach.cookie)).value?.changed, false);
    assert.equal((await action('appointAdmin', [secretary.id], coach.cookie)).value?.ok, true);
    const [office] = await sql`select role,exco_position from users where id=${secretary.id}`;
    assert.equal(office.role, 'admin'); assert.equal(office.exco_position, 'general_secretary');
    passed('coach admin appointment, self/member/inactive/missing-account rejection, immediate access, idempotency, retained office');
    return;
  }
  const application = { semesterLabel: 'Current semester', paymentReference: 'WORKFLOW-ADMISSION', paymentReceiptData: png, membershipCategory: 'undergraduate', matricOrStaffNo: 'WORKFLOW/001', fullName: 'Workflow Test Member', surname: 'Workflowtest', username: 'workflow_test_member', department: 'Test Department', faculty: 'Test Faculty', levelYear: '100', gender: 'Male', dob: '2000-01-01', phone: '08000000000', email: recipient, address: 'Test address Lagos', photoData: png, emergencyContactName: 'Test Guardian', emergencyContactRelationship: 'Guardian', emergencyContactPhone: '08000000001', priorTraining: false, subCommitteePref1Id: committees[0], subCommitteePref2Id: committees[1], subCommitteePref3Id: committees[2], statementOfPurpose: 'This is an automated workflow test application for the club portal.', waiverRiskAck: true, waiverReleaseAck: true, waiverMedicalAck: true, waiverMediaConsent: false, waiverSignatureName: 'Workflow Test Member', waiverSignatureDate: date(), isMinor: false };
  const registration = (await action('submitApplication', [application, protection])).value;
  assert.equal(registration?.ok, true);
  await action('reviewApplication', [registration.applicationId, 'approved'], coach.cookie, true);
  await action('reviewApplication', [registration.applicationId, 'approved'], admin.cookie, true);
  await action('reviewAdmissionPayment', [registration.applicationId, 'confirmed'], coach.cookie, true);
  const privateReceipt = await fetch(base + '/api/admission-receipts/' + registration.applicationId, { headers: { cookie: treasurer.cookie } });
  assert.equal(privateReceipt.status, 200); assert.match(privateReceipt.headers.get('cache-control'), /no-store/);
  assert.equal((await fetch(base + '/api/admission-receipts/' + registration.applicationId)).status, 404);
  assert.equal((await fetch(base + '/api/admission-receipts/' + registration.applicationId, { headers: { cookie: coach.cookie } })).status, 404);
  await action('reviewAdmissionPayment', [registration.applicationId, 'declined', 'Test reference mismatch'], treasurer.cookie);
  const trackingToken = new URL(registration.trackingLink, base).searchParams.get('token');
  assert.ok((await page(registration.trackingLink, '')).includes('Test reference mismatch'));
  assert.equal((await action('replaceAdmissionReceipt', ['invalid-token', png, 'UPDATED-REFERENCE'])).value?.ok, false);
  assert.equal((await action('replaceAdmissionReceipt', [trackingToken, png, 'UPDATED-REFERENCE'])).value?.ok, true);
  await page('/dashboard/treasury/admissions', admin.cookie);
  await action('reviewAdmissionPayment', [registration.applicationId, 'confirmed'], admin.cookie);
  assert.equal((await sql`select admission_payment_reviewed_by from applications where id=${registration.applicationId}`)[0].admission_payment_reviewed_by, admin.id);
  const approval = (await action('reviewApplication', [registration.applicationId, 'approved'], admin.cookie)).value;
  assert.equal(approval?.ok, true); assert.equal(approval.loginReady, true);
  console.log('Approval email accepted by provider: ' + approval.emailSent);
  passed('registration -> admin approval; coach approval blocked');
  const login = await action('loginAction', [recipient, 'workflowtest']);
  assert.equal(login.value?.ok, true);
  const loginCookie = login.response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  const [member] = await sql`select id,role from users where email=${recipient}`;
  assert.ok(member);
  const [semesterDues] = await sql`select amount,paid from dues where user_id=${member.id} and period_label='Current semester semester dues'`;
  assert.equal(semesterDues.amount, '5000.00'); assert.equal(semesterDues.paid, true);
  assert.equal((await action('replaceAdmissionReceipt', [trackingToken, png, 'TOO-LATE'])).value?.ok, false);
  await sql`update users set created_at='2020-01-01' where id=${member.id}`;
  member.cookie = loginCookie;
  roleByCookie.set(member.cookie, 'student');
  assert.ok((await page('/dashboard/student', member.cookie)).includes('Workflow Test Member'));
  await page('/dashboard/admin', member.cookie, 307);
  await action('reviewAdmissionPayment', [registration.applicationId, 'confirmed'], member.cookie, true);
  passed('real surname-password login, member dashboard, admin access denial');
  if (process.env.MEMBERSHIP_CHECK === 'true') {
    let details = {levelYear:'100',phone:'08000000000',address:'Test address Lagos',beltGrade:'',membershipCategory:'undergraduate',matricOrStaffNo:'WORKFLOW/001',department:'Test Department',faculty:'Test Faculty',graduationYear:'',institution:'',occupation:''};
    const confirmation = {confirmed:true,reason:'My verified membership and academic situation has changed.'};
    const approve = async () => {
      const [pending] = await sql`select id from profile_change_requests where user_id=${member.id} and status='pending'`;
      await approveProfile(pending.id);
    };
    assert.equal((await action('updateOwnProfile',[{...details,membershipCategory:'alumni'},confirmation],member.cookie)).value.ok,false);
    details={...details,membershipCategory:'alumni',graduationYear:'2025'};
    assert.equal((await action('updateOwnProfile',[details],member.cookie)).value.ok,false,'Academic changes require a reason and confirmation');
    assert.equal((await action('updateOwnProfile',[details,confirmation],member.cookie)).value.ok,true);
    assert.equal((await sql`select membership_category from member_profiles where user_id=${member.id}`)[0].membership_category,'undergraduate','Changes remain pending');
    await approve();
    assert.equal((await sql`select role from users where id=${member.id}`)[0].role,'alumni');
    details={...details,membershipCategory:'non_student',occupation:'Software developer'};
    assert.equal((await action('updateOwnProfile',[details,confirmation],member.cookie)).value.ok,true);await approve();
    assert.equal((await sql`select role from users where id=${member.id}`)[0].role,'student');
    assert.equal((await action('updateOwnProfile',[{...details,membershipCategory:'undergraduate',matricOrStaffNo:''},confirmation],member.cookie)).value.ok,false);
    details={...details,membershipCategory:'undergraduate',matricOrStaffNo:'NEW/001',department:'New Course',faculty:'New Faculty',levelYear:'200'};
    assert.equal((await action('updateOwnProfile',[details,confirmation],member.cookie)).value.ok,true);await approve();
    details={...details,department:'Changed Course'};
    assert.equal((await action('updateOwnProfile',[details,confirmation],member.cookie)).value.ok,true);await approve();
    assert.equal((await sql`select department from member_profiles where user_id=${member.id}`)[0].department,'Changed Course');
    details={...details,membershipCategory:'staff',matricOrStaffNo:'STAFF/001',department:'Library',institution:'University of Lagos'};
    assert.equal((await action('updateOwnProfile',[details,confirmation],member.cookie)).value.ok,true);await approve();
    assert.equal((await sql`select role from users where id=${member.id}`)[0].role,'student','Staff category must not grant privileged access');
    await action('updateExcoPosition',[member.id,'welfare_officer'],coach.cookie);
    details={...details,membershipCategory:'alumni'};
    assert.equal((await action('updateOwnProfile',[details,confirmation],member.cookie)).value.ok,true);await approve();
    const [officer]=await sql`select role,exco_position from users where id=${member.id}`;assert.equal(officer.role,'exco');assert.equal(officer.exco_position,'welfare_officer');
    assert.equal((await action('changeOwnUsername', ['workflow_member'], member.cookie)).value?.ok, true);
    assert.notEqual((await sql`select username from users where id=${member.id}`)[0].username, 'workflow_member');
    await approve();
    assert.equal((await sql`select username from users where id=${member.id}`)[0].username, 'workflow_member');
    passed('verified membership and username changes, four approvals, and preserved Exco privileges');
    return;
  }
  if (process.env.REPORT_ADMISSION_CHECK === 'true') {
    const parts = new Intl.DateTimeFormat('en', {timeZone:'Africa/Lagos',year:'numeric',month:'2-digit'}).formatToParts(new Date());
    const year = Number(parts.find(p=>p.type==='year').value), month = Number(parts.find(p=>p.type==='month').value);
    const reportMonth = new Date(Date.UTC(year,month-2,1)).toISOString().slice(0,7);
    const paidAt = new Date(reportMonth + '-15T10:00:00+01:00');
    await sql`update applications set admission_payment_reviewed_at=${paidAt} where id=${registration.applicationId}`;
    await sql`update dues set paid_at=${paidAt} where user_id=${member.id}`;
    const [paidSemester] = await sql`select id from dues where user_id=${member.id}`;
    await action('saveReceiptSignature', [png], treasurer.cookie);
    assert.equal((await action('issueReceipt', [paidSemester.id], treasurer.cookie)).value.ok, true);
    assert.equal(new Date((await sql`select paid_at from dues where id=${paidSemester.id}`)[0].paid_at).toISOString(), paidAt.toISOString(), 'Issuing a receipt preserves the original payment date');
    await sql`update users set exco_position='president' where id=${admin.id}`;
    await action('saveMonthlyReportEmails', ['extra@workflow.invalid'], member.cookie, true);
    await action('saveMonthlyReportEmails', ['not-an-email'], coach.cookie, true);
    await action('saveMonthlyReportEmails', ['extra@workflow.invalid'], coach.cookie);
    assert.ok((await page('/dashboard/reports?month='+reportMonth, coach.cookie)).includes('5000.00'));
    const denied = await fetch(base+'/dashboard/reports', {headers:{cookie:member.cookie},redirect:'manual'});
    const deniedHtml=await denied.text();assert.ok(denied.status===307||deniedHtml.includes('NEXT_REDIRECT'));assert.ok(!deniedHtml.includes('Confirmed collections (NGN)'));
    const report=(await action('sendMonthlySummary',[reportMonth],coach.cookie)).value;
    assert.equal(report.recipients,3);assert.equal(report.submitted,3);
    const [archive]=await sql`select * from monthly_reports where month=${reportMonth}`;
    assert.equal(archive.summary['Confirmed collections (NGN)'],'5000.00','Registration payment must not be counted twice');
    assert.equal((await action('sendMonthlySummary',[reportMonth],coach.cookie)).value.submitted,0,'Repeat send must not duplicate');
    await sql`insert into dues (user_id,period_label,amount,paid,paid_at) values (${member.id},'Changed after archive','100.00',true,${paidAt})`;
    await action('sendMonthlySummary',[reportMonth],coach.cookie);
    assert.equal((await sql`select summary from monthly_reports where month=${reportMonth}`)[0].summary['Confirmed collections (NGN)'],'5000.00','Saved reports remain unchanged');
    assert.equal((await fetch(base+'/api/cron/monthly-summary')).status,401);
    const cron=await fetch(base+'/api/cron/monthly-summary',{headers:{Authorization:'Bearer '+process.env.CRON_SECRET}});assert.equal(cron.status,200);
    const deliveries=await sql`select email,status from monthly_report_deliveries where report_id=${archive.id}`;assert.equal(deliveries.length,3);assert.ok(deliveries.every(row=>row.status==='sent'));
    passed('private admission receipt, admin/treasurer confirmation, declined-receipt resubmission, approval gate, paid semester ledger, monthly recipients/archive/deduplication/cron authorization');
    return;
  }
  const profile = { levelYear: '200', phone: '08000000002', address: 'Test address Lagos', beltGrade: '' };
  assert.equal((await action('updateOwnProfile', [{ ...profile, fullName: 'Unauthorized rename' }], member.cookie)).value?.ok, false);
  assert.equal((await action('updateOwnProfile', [profile, {confirmed:true,reason:'Progressed to the next academic level'}], member.cookie)).value?.ok, true);
  const [request] = await sql`select id from profile_change_requests where user_id=${member.id} and status='pending'`;
  assert.equal((await sql`select level_year from member_profiles where user_id=${member.id}`)[0].level_year, '100');
  await approveProfile(request.id);
  assert.equal((await sql`select level_year from member_profiles where user_id=${member.id}`)[0].level_year, '200');
  passed('immutable name; profile changes stay pending until all four approvals');
  assert.equal((await action('updateOwnProfile', [{ ...profile, beltGrade: 'White Belt 10th Geup' }], member.cookie)).value?.ok, true);
  const [beltRequest] = await sql`select id from profile_change_requests where user_id=${member.id} and status='pending'`;
  await approveProfile(beltRequest.id);
  const coachSettings = await page('/dashboard/settings', coach.cookie);
  assert.match(coachSettings, /Black Belt 9th Dan/);
  assert.ok(!/<option[^>]*value="White Belt/.test(coachSettings));
  passed('four approvals for belt changes; coach belt options limited to black belt Dans');
  const appointees = [await account('student'), await account('student'), await account('student')];
  await action('updateExcoPosition', [appointees[0].id, 'welfare_officer'], coach.cookie);
  await action('updateExcoPosition', [appointees[1].id, 'welfare_officer'], admin.cookie);
  assert.equal((await action('updateExcoPosition', [appointees[2].id, 'welfare_officer'], admin.cookie)).value?.ok, false);
  assert.equal((await sql`select count(*)::int as total from users where exco_position='welfare_officer'`)[0].total, 2);
  passed('coach/admin Exco appointment; third appointment rejected');
  await action('submitContactMessage', [{ name: 'Workflow test', email: recipient, message: 'This is a workflow test contact message.' }, protection]);
  for (const actor of [coach, admin]) assert.ok((await page('/dashboard/messages', actor.cookie)).includes('workflow test contact message'));
  const inboxDenied = await fetch(base + '/dashboard/messages', { headers: { cookie: member.cookie }, redirect: 'manual' });
  const deniedHtml = await inboxDenied.text();
  assert.ok(inboxDenied.status === 307 || deniedHtml.includes('NEXT_REDIRECT'), 'Member inbox access redirects, including streamed redirects');
  assert.ok(!deniedHtml.includes('This is a workflow test contact message.'), 'Inbox content must never reach members');
  passed('contact submission visible to coach/admin, hidden from members');
  await action('createGalleryItem', [{ imageUrl: png, caption: 'Workflow CMS image', category: 'training' }], member.cookie, true);
  await action('createGalleryItem', [{ imageUrl: png, caption: 'Workflow CMS image', category: 'training' }], admin.cookie);
  const [photo] = await sql`select id from gallery_items where caption='Workflow CMS image'`;
  assert.ok(photo);
  const version = createHash('sha256').update(png).digest('hex').slice(0, 16);
  const media = await fetch(base + '/media/gallery/' + photo.id + '?v=' + version);
  assert.equal(media.status, 200); assert.match(media.headers.get('content-type'), /image\/png/);
  await action('deleteGalleryItem', [photo.id], admin.cookie);
  passed('admin CMS publishing, public raster media, deletion; member edits blocked');
  await action('reportPayment', [{ periodLabel: 'Workflow membership dues', amount: '1500.00', reference: 'WORKFLOW-TEST' }], member.cookie);
  const [charge] = await sql`select id from dues where user_id=${member.id} and period_label='Workflow membership dues'`;
  await action('declinePaymentClaim', [charge.id, 'Test incorrect payment reference'], admin.cookie, true);
  await action('declinePaymentClaim', [charge.id, 'Test incorrect payment reference'], treasurer.cookie);
  assert.equal((await sql`select paid,payment_claimed from dues where id=${charge.id}`)[0].payment_claimed, false);
  await action('claimDuesPayment', [charge.id, 'WORKFLOW-CORRECTED'], member.cookie);
  assert.equal((await action('issueReceipt', [charge.id], treasurer.cookie)).value?.ok, false);
  await action('saveReceiptSignature', [png], coach.cookie, true);
  assert.equal((await action('saveReceiptSignature', [png], treasurer.cookie)).value?.ok, true);
  const receipt = (await action('issueReceipt', [charge.id], treasurer.cookie)).value;
  assert.equal(receipt?.ok, true);
  assert.equal((await action('issueReceipt', [charge.id], treasurer.cookie)).value?.ok, false);
  assert.ok((await page('/dashboard/receipts/' + charge.id, member.cookie)).includes(receipt.receiptNo));
  assert.ok((await page('/dashboard/treasury/logbook/' + charge.id, treasurer.cookie)).includes('Workflow membership dues'));
  passed('payment report -> treasurer decline -> resubmit -> signature -> receipt/logbook; duplicate blocked');
  const period = (await action('openAttendancePeriod', [{ name: 'Workflow first period', startsOn: date(-4) }], coach.cookie)).value;
  assert.equal(period?.ok, true);
  assert.equal((await action('openAttendancePeriod', [{ name: 'Overlap test', startsOn: date(-3) }], coach.cookie)).value?.ok, false);
  await action('createTrainingSession', [{ title: 'Workflow expired session', date: date(-3), startTime: '16:00', endTime: '18:00' }], coach.cookie);
  const [training] = await sql`select id from training_sessions where title='Workflow expired session'`;
  await action('selfCheckIn', [training.id], member.cookie, true);
  await action('markAttendance', [training.id, [{ userId: member.id, present: true }]], coach.cookie);
  assert.equal((await sql`select present from attendance where user_id=${member.id} and session_id=${training.id}`)[0].present, true);
  await action('submitLeaveRequest', [{ reasonCategory: 'personal', startDate: date(1), endDate: date(2), details: 'Workflow test leave request' }], member.cookie);
  const [leave] = await sql`select id from leave_requests where user_id=${member.id}`;
  await action('reviewLeaveRequest', [leave.id, 'approved'], admin.cookie, true);
  await action('reviewLeaveRequest', [leave.id, 'approved'], coach.cookie);
  passed('one attendance period, 24h check-in expiry, coach post-session marking, coach-only leave approval');
  await action('openGradingWindow', [{ opensAt: date(-1), closesAt: date(20) }], coach.cookie);
  const grading = (await action('createGrading', [{ title: 'Workflow grading', date: date(10), fee: '2500.00' }], coach.cookie)).value;
  assert.ok(grading?.id);
  gradingPath = '/dashboard/coach/grading/' + grading.id;
  const gradingPage = await page('/dashboard/grading', member.cookie);
  assert.ok(gradingPage.includes('2,500') || gradingPage.includes('2500'), 'Member sees stipulated grading fee');
  await action('requestGrading', ['yellow', 'Workflow grading request'], member.cookie);
  const [gradingRequest] = await sql`select id from grading_requests where user_id=${member.id}`;
  assert.ok(gradingRequest);
  await action('acceptGradingRequest', [{ requestId: gradingRequest.id, gradingId: grading.id }], coach.cookie);
  assert.equal((await sql`select amount from dues where user_id=${member.id} and grading_id=${grading.id}`)[0].amount, '2500.00');
  passed('grading window, visible application fee, member request, coach acceptance, fee charge');
  const [candidate] = await sql`select id from grading_candidates where user_id=${member.id} and grading_id=${grading.id}`;
  const invite = (await action('createExternalExaminerInvite', [{ gradingId: grading.id, examinerName: 'Workflow Test Examiner', examinerEmail: recipient }], coach.cookie)).value;
  assert.ok(invite?.inviteUrl);
  assert.ok((await page(new URL(invite.inviteUrl).pathname, '')).includes('Workflow Test Examiner'));
  const decision = (await action('saveCandidateScores', [{ candidateId: candidate.id, scores: { basics: 8, poomsae: 8, kyorugi: 8, kyukpa: 8, hoshinsul: 8, theory: 8 }, outcome: 'pass', awardedRankId: '8th-geup', examinerNotes: 'Workflow test marks' }], coach.cookie)).value;
  assert.equal(decision?.awardedRank, '8th-geup');
  await action('publishGrading', [grading.id], coach.cookie);
  assert.match((await sql`select belt_grade from member_profiles where user_id=${member.id}`)[0].belt_grade, /Yellow Belt/);
  await action('saveCandidateScores', [{ candidateId: candidate.id, scores: { basics: 10 }, outcome: 'pending' }], coach.cookie, true);
  passed('external examiner link, scoring, published belt promotion, immutable published marks');
  assert.equal((await action('closeAttendancePeriod', [period.id, date()], coach.cookie)).value?.ok, true);
  await action('markAttendance', [training.id, [{ userId: member.id, present: false }]], coach.cookie, true);
  assert.equal((await action('openAttendancePeriod', [{ name: 'Workflow next period', startsOn: date() }], coach.cookie)).value?.ok, true);
  assert.equal((await sql`select count(*)::int as total from attendance_period_snapshots where period_id=${period.id}`)[0].total > 0, true);
  passed('period closure, immutable archived attendance, new monitoring period');
  await action('requestPasswordReset', [recipient]);
  const [reset] = await sql`select reset_requested_at,reset_token from users where id=${member.id}`;
  assert.ok(reset.reset_token?.startsWith('sha256:'));
  if (reset.reset_requested_at) {
    const recovery = (await action('issuePasswordResetLink', [member.id], admin.cookie)).value;
    assert.equal(recovery?.ok, true);
    const token = new URL(recovery.resetLink, base).searchParams.get('token');
    assert.equal((await action('completePasswordReset', [token, 'Workflow-Test!New2026Password'])).value?.ok, true);
    assert.equal((await action('completePasswordReset', [token, 'Another-Test!New2026Password'])).value?.ok, false);
    assert.ok(!(await (await fetch(base + '/api/auth/session', { headers: { cookie: member.cookie } })).json())?.user);
    assert.equal((await action('loginAction', [recipient, 'Workflow-Test!New2026Password'])).value?.ok, true);
    passed('email failure -> admin recovery -> single-use reset -> old session invalidation -> new-password login');
  } else {
    passed('reset email accepted by provider; inbox delivery requires recipient confirmation');
    // The emailed token is intentionally unavailable to this runner. Exercise
    // redemption with a separate token fixture in this isolated schema only.
    const token = randomBytes(32).toString('hex');
    const stored = 'sha256:' + createHash('sha256').update(token).digest('hex');
    await sql`update users set reset_token=${stored}, reset_token_expires=now()+interval '1 hour' where id=${member.id}`;
    assert.equal((await action('completePasswordReset', [token, 'Workflow-Test!New2026Password'])).value?.ok, true);
    assert.equal((await action('completePasswordReset', [token, 'Another-Test!New2026Password'])).value?.ok, false);
    assert.ok(!(await (await fetch(base + '/api/auth/session', { headers: { cookie: member.cookie } })).json())?.user);
    assert.equal((await action('loginAction', [recipient, 'Workflow-Test!New2026Password'])).value?.ok, true);
    passed('separate reset-token fixture: single-use redemption, old session invalidation, new-password login');
  }
  if (process.env.MOCK_WORKFLOW_EMAIL === 'true') {
    const titles = (await sql`select title from notifications where user_id=${member.id}`).map(row => row.title);
    for (const title of ['Membership approved','Profile changes reviewed','Payment claim declined','Payment receipt issued','Leave request reviewed','Grading request reviewed','Grading results published']) assert.ok(titles.includes(title), 'Missing member notification: ' + title);
    for (const [reviewer, title] of [[admin, 'Semester dues confirmed'], [coach, 'Contact message received'], [treasurer, 'Payment claim received']]) {
      const [count] = await sql`select count(*)::int as n from notifications where user_id=${reviewer.id} and title=${title}`;
      assert.ok(count.n > 0, 'Missing reviewer notification: ' + title);
    }
    passed('member and reviewer notifications persisted across approval, profile, payment, leave, contact, and grading workflows');
  }
  console.log(`Workflow HTTP test passed: ${checks.length} groups. Delivery acceptance is reported separately from inbox delivery.`);
}
try { await run(); }
catch (error) { console.error(error instanceof assert.AssertionError ? error.stack : 'Workflow test failed: ' + (error?.code || error?.name || 'unknown')); process.exitCode = 1; }
finally {
  if (server && server.exitCode === null) { server.kill(); await Promise.race([once(server, 'exit'), new Promise(resolve => setTimeout(resolve, 3000))]); }
  if (sql) await sql.end();
  await unlink(mockLog).catch(() => {}); await unlink(mockFailure).catch(() => {});
  if (created) { assert.match(schema, /^workflow_check_[a-f0-9]{32}$/); await owner`drop schema ${owner(schema)} cascade`; console.log('Isolated test schema removed; existing club records unchanged.'); }
  await owner.end();
}
