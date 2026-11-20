// Loaded only by isolated tests through that child process's NODE_OPTIONS.
// Node's --require test preload must be CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('node:fs');
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = typeof input === 'string' ? input : input?.url || String(input);
  if (url === 'https://api.resend.com/emails') {
    const payload = JSON.parse(options.body);
    const failed = process.env.MOCK_EMAIL_FAILURE_FILE && fs.existsSync(process.env.MOCK_EMAIL_FAILURE_FILE);
    if (process.env.MOCK_EMAIL_LOG) fs.appendFileSync(process.env.MOCK_EMAIL_LOG, JSON.stringify({ to: payload.to, subject: payload.subject, html: payload.html, replyTo: payload.reply_to, idempotencyKey: new Headers(options.headers).get('Idempotency-Key'), failed }) + '\n');
    return Response.json(failed ? { message: 'Simulated provider failure' } : { id: 'mock-email-accepted' }, { status: failed ? 500 : 200 });
  }
  return originalFetch(input, options);
};
