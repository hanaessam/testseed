"use client";

import { Alert } from "@/components/ui/alert";
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

  if (!pendingEmail) {
    return (
      <p className="text-sm text-muted">
        No email change is waiting for verification. Update your email in Profile to start a new
        verification flow.
      </p>
    );
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm leading-6 text-muted">
        Your current email stays active until you verify <span className="text-foreground">{pendingEmail}</span>.
      </p>
      <div className="max-w-xs space-y-2">
        <Label htmlFor="emailCode">Verification code</Label>
        <Input
          id="emailCode"
          inputMode="numeric"
          maxLength={6}
          pattern="[0-9]{6}"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          className="font-mono tracking-widest"
          required
        />
      </div>

      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
        Verify email
      </Button>
    </form>
  );
}
