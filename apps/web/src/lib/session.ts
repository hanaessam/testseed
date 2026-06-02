"use client";

import type { AuthResponse, AuthUser } from "@testseed/types";

const sessionStorageKey = "testseedSession";
const legacyTokenKey = "testseedToken";
const fallbackSessionTtlMs = 60 * 60 * 1000;

export interface StoredSession {
  token: string;
  user?: AuthUser;
  expiresAt: string;
}

export function saveAuthSession(auth: AuthResponse): StoredSession {
  return saveTokenSession(auth.token, auth.user);
}

export function saveTokenSession(token: string, user?: AuthUser): StoredSession {
  const session: StoredSession = {
    token,
    user,
    expiresAt: new Date(getTokenExpiryMs(token) ?? Date.now() + fallbackSessionTtlMs).toISOString()
  };

  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
  window.localStorage.setItem(legacyTokenKey, token);

  return session;
}

export function updateStoredSessionUser(user: AuthUser): StoredSession | null {
  const session = getStoredSession();
  if (!session) {
    return null;
  }

  const nextSession = { ...session, user };
  window.localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
  return nextSession;
}

export function getStoredSession(): StoredSession | null {
  const session = readStoredSession();
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    clearStoredSession();
    return null;
  }

  return session;
}

export function getStoredAuthToken(): string | null {
  return getStoredSession()?.token ?? null;
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(sessionStorageKey);
  window.localStorage.removeItem(legacyTokenKey);
}

function readStoredSession(): StoredSession | null {
  const rawSession = window.localStorage.getItem(sessionStorageKey);
  if (rawSession) {
    try {
      const parsed = JSON.parse(rawSession) as StoredSession;
      if (parsed.token && parsed.expiresAt) {
        return normalizeSession(parsed);
      }
    } catch {
      clearStoredSession();
      return null;
    }
  }

  const legacyToken = window.localStorage.getItem(legacyTokenKey);
  return legacyToken ? saveTokenSession(legacyToken) : null;
}

function normalizeSession(session: StoredSession): StoredSession {
  return {
    ...session,
    user: session.user
      ? {
          ...session.user,
          createdAt: new Date(session.user.createdAt)
        }
      : undefined
  };
}

function getTokenExpiryMs(token: string): number | null {
  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    const decoded = JSON.parse(decodeBase64Url(payload)) as { exp?: number };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return window.atob(padded);
}
