"use client";

import type { SessionLoginReason } from "@/src/lib/auth-session.shared";
import {
  clearStoredSession,
  getSessionStatus,
  getStoredSession,
  markSessionExpired,
  type StoredSession
} from "@/src/lib/session";

export {
  AuthenticationError,
  getSessionNoticeMessage,
  isAuthenticationError,
  resolveLoginReason,
  type SessionLoginReason
} from "@/src/lib/auth-session.shared";

interface LoginRouter {
  replace(href: string): void;
}

export const SESSION_EXPIRED_EVENT = "testseed:session-expired";

export function notifySessionExpired(): void {
  markSessionExpired();
  clearStoredSession();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
}

export function requireStoredSession(router: LoginRouter): StoredSession | null {
  const status = getSessionStatus();
  if (status === "expired") {
    redirectToLogin(router, "session_expired");
    return null;
  }
  if (status === "missing") {
    redirectToLogin(router, "session_inactive");
    return null;
  }

  return getStoredSession();
}

export function redirectToLogin(
  router: LoginRouter,
  reason: SessionLoginReason = "session_inactive"
): void {
  if (reason === "session_expired") {
    markSessionExpired();
  }
  clearStoredSession();
  router.replace(`/login?reason=${reason}`);
}
