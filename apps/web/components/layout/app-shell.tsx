"use client";

import { LogoutButton } from "@/components/auth/logout-button";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { getStoredSession, type StoredSession } from "@/src/lib/session";
import { BarChart3, FolderKanban, History, LayoutDashboard, Sprout, UserCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/generate", label: "Generate", icon: Sprout },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard", label: "History", icon: History },
  { href: "/dashboard", label: "Account", icon: UserCircle }
];

export function AppShell({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);

  useEffect(() => {
    setSession(getStoredSession());

    function handleStorage() {
      setSession(getStoredSession());
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const email = session?.user?.email ?? "Signed in";
  const expiry = session ? formatExpiry(session.expiresAt) : "Session inactive";
  const initials = getInitials(session?.user?.email);

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
            return (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                className="flex h-9 items-center gap-2 border border-transparent px-2 text-sm text-muted transition-colors hover:border-border hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border border-border bg-background font-mono text-xs text-accent">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{email}</p>
              <p className="truncate text-xs text-muted">{expiry}</p>
            </div>
          </div>
          <Button className="mt-3 w-full" variant="secondary">
            <BarChart3 className="h-4 w-4" />
            Workspace
          </Button>
          <LogoutButton />
        </div>
      </aside>

      <main className="ml-60 min-h-screen animate-fade-in">{children}</main>
    </div>
  );
}

function getInitials(email?: string): string {
  if (!email) {
    return "TS";
  }

  return email.slice(0, 2).toUpperCase();
}

function formatExpiry(expiresAt: string): string {
  return `Session until ${new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(expiresAt))}`;
}
