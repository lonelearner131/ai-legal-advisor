// In-memory store for uploaded documents per session.
// In a real app, you'd use Redis or a DB, but for MVP this avoids disk I/O.
export const sessionStore = new Map<string, any>();

export function getSessionData(sessionId: string) {
  return sessionStore.get(sessionId);
}

export function setSessionData(sessionId: string, data: any) {
  sessionStore.set(sessionId, data);
}

export function clearSession(sessionId: string) {
  sessionStore.delete(sessionId);
}
