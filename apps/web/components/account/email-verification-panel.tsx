"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyEmailChange } from "@/src/lib/api-client";
import { updateStoredSessionUser } from "@/src/lib/session";
import type { AuthUser } from "@testseed/types";
import { Loader2, MailCheck } from "lucide-react";
import { FormEvent, useState } from "react";

interface EmailVerificationPanelProps {
  token: string;
  user: AuthUser;
  onUserChange(user: AuthUser): void;
}

export function EmailVerificationPanel({ token, user, onUserChange }: EmailVerificationPanelProps) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const pendingEmail = user.pendingEmail;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingEmail) return;

    setMessage("");
    setError("");
    setIsLoading(true);

    try {
      const response = await verifyEmailChange({ code }, token);
      updateStoredSessionUser(response.user);
      onUserChange(response.user);
      setCode("");
      setMessage("Email verified.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not verify email");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4 border border-border bg-surface p-4" onSubmit={submit}>
      <div>
        <p className="font-mono text-xs text-accent">account.email</p>
        <h2 className="mt-1 text-lg font-semibold">Email verification</h2>
      </div>

      {pendingEmail ? (
        <>
          <p className="text-sm leading-6 text-muted">
            Current email remains active until you verify {pendingEmail}.
          </p>
          <div className="space-y-2">
            <Label htmlFor="emailCode">Verification code</Label>
            <Input
              id="emailCode"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              required
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
            Verify email
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted">No email change is waiting for verification.</p>
      )}

      {message ? <p className="border border-accent px-3 py-2 text-sm text-accent">{message}</p> : null}
      {error ? <p className="border border-error px-3 py-2 text-sm text-error">{error}</p> : null}
    </form>
  );
}
