"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/src/lib/api-client";
import { KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsLoading(true);

    try {
      const response = await resetPassword({ email, code, newPassword, confirmPassword });
      setEmail("");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(response.message);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not reset password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-5 p-5">
        <div>
          <p className="font-mono text-xs text-accent">auth.reset</p>
          <h1 className="mt-2 text-xl font-semibold">Reset password</h1>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="resetEmail">Email</Label>
            <Input
              id="resetEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resetCode">Reset code</Label>
            <Input
              id="resetCode"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField id="newPassword" label="New password" value={newPassword} onChange={setNewPassword} />
            <PasswordField id="confirmPassword" label="Verify password" value={confirmPassword} onChange={setConfirmPassword} />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Reset password
          </Button>
        </form>

        {message ? <p className="border border-accent px-3 py-2 text-sm text-accent">{message}</p> : null}
        {error ? <p className="border border-error px-3 py-2 text-sm text-error">{error}</p> : null}

        <div className="flex justify-between text-sm">
          <Link className="text-accent hover:text-foreground" href="/forgot-password">
            Request a new code
          </Link>
          <Link className="text-muted hover:text-foreground" href="/login">
            Back to login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  onChange(value: string): void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </div>
  );
}
