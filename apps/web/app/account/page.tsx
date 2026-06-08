"use client";

import {
  AccountProfileForm,
  DeleteAccountPanel,
  EmailVerificationPanel,
  PasswordChangeForm
} from "@/components/account";
import { AppShell } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/src/lib/api-client";
import { isAuthenticationError, redirectToLogin, requireStoredSession } from "@/src/lib/auth-session";
import { updateStoredSessionUser } from "@/src/lib/session";
import type { AuthUser } from "@testseed/types";
import { KeyRound, ShieldAlert, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AccountSection = "profile" | "security" | "danger";

export default function AccountPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [section, setSection] = useState<AccountSection>("profile");

  useEffect(() => {
    const session = requireStoredSession(router);
    if (!session) {
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
          redirectToLogin(router, "session_expired");
          return;
        }

        updateStoredSessionUser(response.user);
        setUser(response.user);
        if (response.user.pendingEmail) {
          setSection("profile");
        }
      } catch (loadError) {
        if (!isMounted) return;
        if (isAuthenticationError(loadError)) {
          redirectToLogin(router, "session_expired");
          return;
        }
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

  const initials = useMemo(() => getInitials(user?.displayName ?? user?.email), [user]);
  const memberSince = user ? formatMemberSince(user.createdAt) : "";

  return (
    <AppShell>
      <section className="space-y-6 p-6">
        <div className="border-b border-border pb-6">
          <p className="font-mono text-xs text-accent">settings.account</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Account settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Manage your profile, sign-in security, and account lifecycle.
          </p>
        </div>

        {isLoading ? (
          <AccountPageSkeleton />
        ) : error ? (
          <Alert tone="danger" title="Could not load account">
            {error}
          </Alert>
        ) : user ? (
          <div className="space-y-6">
            <Card>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-sm font-semibold text-accent">
                    {initials}
                  </div>
                  <div>
                    <p className="text-base font-semibold">{user.displayName || "Account user"}</p>
                    <p className="mt-1 text-sm text-muted">{user.email}</p>
                    <p className="mt-1 text-xs text-muted">Member since {memberSince}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.pendingEmail ? (
                    <span className="rounded-md border border-warning-border bg-warning-subtle px-2 py-1 text-xs text-warning-text">
                      Email verification pending
                    </span>
                  ) : (
                    <span className="rounded-md bg-accent/10 px-2 py-1 text-xs text-accent">
                      Email verified
                    </span>
                  )}
                  {user.status ? (
                    <span className="rounded-md bg-background/60 px-2 py-1 font-mono text-xs text-muted">
                      {user.status}
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {user.pendingEmail ? (
              <Alert tone="warning" title="Finish your email change">
                Verify {user.pendingEmail} in the Profile section before the new address becomes
                active.
              </Alert>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
              <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
                <AccountNavButton
                  active={section === "profile"}
                  icon={UserCircle}
                  label="Profile"
                  hint="Name and email"
                  onClick={() => setSection("profile")}
                />
                <AccountNavButton
                  active={section === "security"}
                  icon={KeyRound}
                  label="Security"
                  hint="Password"
                  onClick={() => setSection("security")}
                />
                <AccountNavButton
                  active={section === "danger"}
                  icon={ShieldAlert}
                  label="Danger zone"
                  hint="Delete account"
                  onClick={() => setSection("danger")}
                />
              </nav>

              <div className="min-w-0">
                {section === "profile" ? (
                  <div className="space-y-5">
                    <Card>
                      <CardHeader>
                        <p className="font-mono text-xs text-accent">account.profile</p>
                        <h2 className="mt-1 text-lg font-semibold">Profile</h2>
                        <p className="mt-2 text-sm text-muted">
                          Update how your name and email appear across TestSeed.
                        </p>
                      </CardHeader>
                      <CardContent>
                        <AccountProfileForm token={token} user={user} onUserChange={setUser} />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <p className="font-mono text-xs text-accent">account.email</p>
                        <h2 className="mt-1 text-lg font-semibold">Email verification</h2>
                      </CardHeader>
                      <CardContent>
                        <EmailVerificationPanel token={token} user={user} onUserChange={setUser} />
                      </CardContent>
                    </Card>
                  </div>
                ) : null}

                {section === "security" ? (
                  <Card>
                    <CardHeader>
                      <p className="font-mono text-xs text-accent">account.password</p>
                      <h2 className="mt-1 text-lg font-semibold">Password</h2>
                      <p className="mt-2 text-sm text-muted">
                        Use a strong unique password. You will stay signed in on this device after
                        changing it.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <PasswordChangeForm token={token} />
                    </CardContent>
                  </Card>
                ) : null}

                {section === "danger" ? (
                  <Card className="border-error/30">
                    <CardHeader>
                      <p className="font-mono text-xs text-error">account.danger</p>
                      <h2 className="mt-1 text-lg font-semibold">Delete account</h2>
                      <p className="mt-2 text-sm text-muted">
                        This immediately revokes access and schedules permanent deletion after 30
                        days.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <DeleteAccountPanel token={token} />
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function AccountNavButton({
  active,
  icon: Icon,
  label,
  hint,
  onClick
}: {
  active: boolean;
  icon: typeof UserCircle;
  label: string;
  hint: string;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[10rem] flex-col rounded-lg px-3 py-2.5 text-left transition-colors lg:min-w-0 lg:w-full ${
        active
          ? "bg-accent/10 text-accent"
          : "text-muted hover:bg-background/60 hover:text-foreground"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </span>
      <span className="mt-1 hidden text-xs text-muted lg:block">{hint}</span>
    </button>
  );
}

function AccountPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <Skeleton className="h-40 rounded-lg lg:h-52" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}

function getInitials(value?: string): string {
  if (!value) {
    return "TS";
  }

  const localPart = value.includes("@") ? (value.split("@")[0] ?? value) : value;
  const parts = localPart.split(/[\s._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return localPart.slice(0, 2).toUpperCase();
}

function formatMemberSince(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric"
  }).format(date);
}
