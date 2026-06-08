export type SessionLoginReason = "session_expired" | "session_inactive";

export class AuthenticationError extends Error {
  constructor(message = "Your session has expired. Please sign in again.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export function resolveLoginReason(
  queryReason: string | null | undefined
): SessionLoginReason | null {
  if (queryReason === "session_expired" || queryReason === "session_inactive") {
    return queryReason;
  }
  return null;
}

export function getSessionNoticeMessage(reason: SessionLoginReason | null): string | null {
  if (reason === "session_expired") {
    return "Your session has expired. Sign in again to continue working.";
  }
  if (reason === "session_inactive") {
    return "You are not signed in. Sign in to access your workspace.";
  }
  return null;
}

export function isAuthenticationError(error: unknown): boolean {
  if (error instanceof AuthenticationError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("authentication") ||
    message.includes("unauthorized") ||
    message.includes("session expired") ||
    message.includes("sign in again") ||
    message.includes("invalid token") ||
    message.includes("jwt expired")
  );
}
