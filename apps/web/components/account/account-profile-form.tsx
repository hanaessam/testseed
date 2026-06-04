"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/src/lib/api-client";
import { updateStoredSessionUser } from "@/src/lib/session";
import type { AuthUser } from "@testseed/types";
import { Loader2, Save } from "lucide-react";
import { FormEvent, useState } from "react";

interface AccountProfileFormProps {
  token: string;
  user: AuthUser;
  onUserChange(user: AuthUser): void;
}

export function AccountProfileForm({ token, user, onUserChange }: AccountProfileFormProps) {
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [email, setEmail] = useState(user.email);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsLoading(true);

    try {
      const response = await updateProfile(
        {
          displayName,
          email: email === user.email ? undefined : email
        },
        token
      );
      updateStoredSessionUser(response.user);
      onUserChange(response.user);
      setMessage(
        response.user.pendingEmail
          ? "Profile saved. Check the new email address for a verification code."
          : "Profile saved."
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not update profile");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4 border border-border bg-surface p-4" onSubmit={submit}>
      <div>
        <p className="font-mono text-xs text-accent">account.profile</p>
        <h2 className="mt-1 text-lg font-semibold">Profile</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={displayName}
            maxLength={120}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountEmail">Email</Label>
          <Input
            id="accountEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
      </div>

      {message ? <p className="border border-accent px-3 py-2 text-sm text-accent">{message}</p> : null}
      {error ? <p className="border border-error px-3 py-2 text-sm text-error">{error}</p> : null}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save profile
      </Button>
    </form>
  );
}
