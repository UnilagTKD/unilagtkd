// Never log driver messages: they can contain connection URLs, SQL, or tokens.
const SAFE_CODES = new Set([
  "EAI_AGAIN", "ENOTFOUND", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT",
  "CONNECT_TIMEOUT", "CONNECTION_CLOSED", "CONNECTION_ENDED", "ERR_INVALID_URL",
  "42P01", "42703", "42501", "28P01", "3D000", "53300", "57P01", "08006",
]);

export function failureCode(error: unknown): string {
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth++) {
    const value = current as { code?: unknown; cause?: unknown };
    if (typeof value.code === "string" && SAFE_CODES.has(value.code)) return value.code;
    current = value.cause;
  }
  return "UNKNOWN";
}
