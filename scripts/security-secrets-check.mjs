// Prints locations and rule names only: never print matched secret values.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['provider credential', /\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk_live_[A-Za-z0-9]{20,}|re_[A-Za-z0-9]{24,})\b/],
  ['database credential URL', /(?:postgres(?:ql)?|mysql):\/\/[^\s:'"<>]+:[^\s'"<>@]+@/],
  ['literal secret assignment', /(?:AUTH_SECRET|NEXTAUTH_SECRET|RESEND_API_KEY|CLOUDINARY_API_SECRET|DATABASE_URL)\s*[:=]\s*["']?(?!process\.|undefined|your[-_]|<|\$\{|https?:\/\/)[A-Za-z0-9_+/=.-]{16,}/],
];
const findings = [];
const inspect = (source, content) => {
  for (const [rule, pattern] of rules) {
    content.split(/\r?\n/).forEach((line, index) => {
      if (pattern.test(line)) findings.push({ source, line: index + 1, rule });
    });
  }
};
const objects = git('rev-list', '--objects', '--all').trim().split(/\r?\n/).filter(Boolean);
let historicalBlobs = 0;
const historicalEnvFiles = [];
for (const entry of objects) {
  const space = entry.indexOf(' ');
  if (space < 0) continue;
  const hash = entry.slice(0, space), path = entry.slice(space + 1);
  if (/(^|\/)\.env(?:\.|$)/.test(path) && !/\.example$/.test(path)) historicalEnvFiles.push({ path, blob: hash });
  if (!/\.(?:[cm]?[jt]sx?|json|sql|ya?ml|md|txt|env|pem|key)$|(^|\/)\.env/.test(path)) continue;
  if (Number(git('cat-file', '-s', hash).trim()) > 3_000_000) continue;
  inspect(`history:${hash}:${path}`, git('cat-file', '-p', hash));
  historicalBlobs++;
}
const files = git('ls-files', '--cached', '--others', '--exclude-standard').trim().split(/\r?\n/);
for (const path of files) {
  if (existsSync(path) && /\.(?:[cm]?[jt]sx?|json|sql|ya?ml|md|txt|env|pem|key)$|(^|\/)\.env/.test(path)) inspect(`working:${path}`, readFileSync(path, 'utf8'));
}
console.log(JSON.stringify({ historicalBlobs, historicalEnvFiles, findings }, null, 2));
if (findings.length || historicalEnvFiles.length) process.exitCode = 1;
