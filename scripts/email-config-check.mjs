// Read-only provider diagnostics. Never prints credentials or member addresses.
const key = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? '';
const domain = from.match(/@([^>\s]+)/)?.[1]?.toLowerCase();
if (!key || !domain) {
  console.log(JSON.stringify({ apiKeyConfigured: !!key, senderConfigured: !!domain }));
} else {
  try {
    const response = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
    const result = await response.json();
    const sender = Array.isArray(result.data) ? result.data.find(item => item.name?.toLowerCase() === domain) : null;
    console.log(JSON.stringify({ apiKeyConfigured: true, senderConfigured: true, domainInspectionStatus: response.status, sendOnlyKey: result.name === 'restricted_api_key', senderDomainVerified: sender ? sender.status === 'verified' : null, consumerSenderDomain: ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com'].includes(domain), testSenderDomain: domain === 'resend.dev' }));
  } catch (error) { console.log(JSON.stringify({ apiKeyConfigured: true, senderConfigured: true, providerInspection: 'unavailable', reason: error?.cause?.code ?? error?.name ?? 'unknown' })); }
}
