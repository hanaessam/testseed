"use client";

import { LogoutButton } from "@/components/auth/logout-button";
import { SessionNotice } from "@/components/auth/session-notice";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import {
  SESSION_EXPIRED_EVENT,
  type SessionLoginReason
} from "@/src/lib/auth-session";
import {
  consumeSessionExpiredFlag,
  getSessionStatus,
  getStoredSession,
  type StoredSession
} from "@/src/lib/session";
import { ChevronRight, FolderKanban, LayoutDashboard, LogIn, Settings, Sprout } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/generate", label: "New project", icon: Sprout },
  { href: "/projects", label: "Projects", icon: FolderKanban }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [sessionIssue, setSessionIssue] = useState<SessionLoginReason | null>(null);

  useEffect(() => {
    function syncSession() {
      const status = getSessionStatus();
      if (status === "expired" || consumeSessionExpiredFlag()) {
        setSession(null);
        setSessionIssue("session_expired");
        return;
      }

      if (status === "missing") {
        setSession(null);
        setSessionIssue("session_inactive");
        return;
      }

      setSession(getStoredSession());
      setSessionIssue(null);
    }

    function handleSessionExpired() {
      setSession(null);
      setSessionIssue("session_expired");
    }

    syncSession();
    window.addEventListener("storage", syncSession);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    const intervalId = window.setInterval(syncSession, 30_000);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
      window.clearInterval(intervalId);
    };
  }, [pathname]);

  const email = session?.user?.email ?? "Not signed in";
  const expiry = session ? formatExpiry(session.expiresAt) : "Session inactive";
  const initials = getInitials(session?.user?.email);
  const isAccountActive = pathname === "/account";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-4 py-4">
          <Link href="/dashboard" aria-label="TestSeed dashboard">
            <Wordmark />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/projects" && pathname.startsWith("/projects/"));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-9 items-center gap-2 rounded-md px-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-background/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-2">
          {sessionIssue ? (
            <div className="mb-2 rounded-lg bg-amber-500/10 px-2 py-2">
              <p className="text-xs font-medium text-amber-200">
                {sessionIssue === "session_expired" ? "Session expired" : "Sign in required"}
              </p>
              <Button asChild className="mt-2 h-8 w-full">
                <Link href={`/login?reason=${sessionIssue}`}>
                  <LogIn className="h-3.5 w-3.5" />
                  Sign in again
                </Link>
              </Button>
            </div>
          ) : null}

          <Link
            href="/account"
            className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors ${
              isAccountActive ? "bg-accent/10" : "hover:bg-background/60"
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-xs font-semibold text-accent">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm font-medium ${
                  isAccountActive ? "text-accent" : "text-foreground"
                }`}
              >
                {email}
              </p>
              <p
                className={`truncate text-xs ${
                  sessionIssue ? "text-amber-300/80" : "text-muted"
                }`}
              >
                {expiry}
              </p>
            </div>
            <ChevronRight
              className={`h-4 w-4 shrink-0 transition-opacity ${
                isAccountActive ? "text-accent opacity-100" : "text-muted opacity-0 group-hover:opacity-100"
              }`}
            />
          </Link>

          <div className="mt-1 flex items-center gap-1 px-1">
            <Link
              href="/account"
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-xs transition-colors ${
                isAccountActive
                  ? "bg-background/80 text-accent"
                  : "text-muted hover:bg-background/60 hover:text-foreground"
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              Account
            </Link>
            <LogoutButton className="h-8 flex-1 text-xs" variant="ghost" />
          </div>
        </div>
      </aside>

      <main className="ml-60 min-h-screen animate-fade-in">
        {sessionIssue ? (
          <div className="border-b border-amber-500/20 bg-amber-500/10 px-6 py-4">
            <SessionNotice reason={sessionIssue} />
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}

function getInitials(email?: string): string {
  if (!email) {
    return "TS";
  }

  const localPart = email.split("@")[0] ?? email;
  const parts = localPart.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return localPart.slice(0, 2).toUpperCase();
}

function formatExpiry(expiresAt: string): string {
  const expiresMs = new Date(expiresAt).getTime();
  if (expiresMs <= Date.now()) {
    return "Session expired";
  }

  return `Until ${new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(expiresAt))}`;
}
