"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getCurrentUser } from "@/src/lib/api-client";
import { saveTokenSession, updateStoredSessionUser } from "@/src/lib/session";

export function GitHubCallback({ token }: { token?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    saveTokenSession(token);
    getCurrentUser(token)
      .then((response) => {
        if (response.user) {
          updateStoredSessionUser(response.user);
        }
      })
      .finally(() => {
        router.replace("/dashboard");
      });
  }, [router, token]);

  return (
    <main className="terminal-grid flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="border border-border bg-surface p-5">
        <p className="font-mono text-xs text-accent">github.auth</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Finishing sign in</h1>
        <p className="mt-2 text-sm text-muted">Redirecting to your TestSeed workspace.</p>
      </div>
    </main>
  );
}
