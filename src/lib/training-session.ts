export const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;
type SessionWindow = { date: string; startTime?: string | null; endedAt?: Date | null };
export function sessionStartsAt(session: SessionWindow): Date {
  const match = session.startTime?.match(/^(\d{1,2}):(\d{2})/);
  const time = match ? `${match[1].padStart(2, "0")}:${match[2]}` : "00:00";
  return new Date(`${session.date}T${time}:00+01:00`);
}
export function sessionExpiresAt(session: SessionWindow): Date {
  return new Date(sessionStartsAt(session).getTime() + SESSION_WINDOW_MS);
}
export function sessionHasEnded(session: SessionWindow, now = new Date()): boolean {
  return Boolean(session.endedAt) || now >= sessionExpiresAt(session);
}
