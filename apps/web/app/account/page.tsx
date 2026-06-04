"use client";

import {
  AccountProfileForm,
  DeleteAccountPanel,
  EmailVerificationPanel,
  PasswordChangeForm
} from "@/components/account";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/src/lib/api-client";
import { clearStoredSession, getStoredSession, updateStoredSessionUser } from "@/src/lib/session";
import type { AuthUser } from "@testseed/types";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AccountPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    let isMounted = true;
    const authToken = session.token;
    setToken(authToken);

    async function loadAccount() {
      try {
        const response = await getCurrentUser(authToken);
        if (!isMounted) return;

        if (!response.user) {
          clearStoredSession();
          router.replace("/login");
          return;
        }

        updateStoredSessionUser(response.user);
        setUser(response.user);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Could not load account");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAccount();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <AppShell>
      <section className="space-y-5 p-6">
        <div className="border-b border-border pb-5">
          <p className="font-mono text-xs text-accent">settings.account</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Account settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Manage your profile, password, email verification, and account lifecycle.
          </p>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center border border-border bg-surface">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : error ? (
          <div className="border border-error bg-surface px-4 py-3 text-sm text-error">{error}</div>
        ) : user ? (
          <div className="grid gap-5">
            <AccountProfileForm token={token} user={user} onUserChange={setUser} />
            <EmailVerificationPanel token={token} user={user} onUserChange={setUser} />
            <PasswordChangeForm token={token} />
            <DeleteAccountPanel token={token} />
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
