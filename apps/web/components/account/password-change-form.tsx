"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/src/lib/api-client";
import { KeyRound, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

export function PasswordChangeForm({ token }: { token: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
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
      const response = await changePassword(
        { currentPassword, newPassword, confirmPassword },
        token
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(response.message);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not change password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4 border border-border bg-surface p-4" onSubmit={submit}>
      <div>
        <p className="font-mono text-xs text-accent">account.password</p>
        <h2 className="mt-1 text-lg font-semibold">Password</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PasswordField
          id="currentPassword"
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
        <PasswordField
          id="newPassword"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
        />
        <PasswordField
          id="confirmPassword"
          label="Verify new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
      </div>

      {message ? <p className="border border-accent px-3 py-2 text-sm text-accent">{message}</p> : null}
      {error ? <p className="border border-error px-3 py-2 text-sm text-error">{error}</p> : null}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        Change password
      </Button>
    </form>
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
