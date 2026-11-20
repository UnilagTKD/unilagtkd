import "server-only";

// Allowlisted metadata only: no bodies, URLs, emails, tokens, or driver errors.
export function securityLog(event: string, details: { actorId?: string; targetId?: string; outcome?: string } = {}) {
  console.info(JSON.stringify({ time: new Date().toISOString(), event, ...details }));
}
