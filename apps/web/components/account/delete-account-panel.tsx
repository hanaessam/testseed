"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount } from "@/src/lib/api-client";
import { clearStoredSession } from "@/src/lib/session";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function DeleteAccountPanel({ token }: { token: string }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await deleteAccount({ currentPassword, confirmationPhrase }, token);
      clearStoredSession();
      router.replace("/login");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not delete account");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4 border border-error bg-surface p-4" onSubmit={submit}>
      <div>
        <p className="font-mono text-xs text-error">account.danger</p>
        <h2 className="mt-1 text-lg font-semibold">Delete account</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          This immediately revokes access and schedules permanent deletion after 30 days.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="deletePassword">Current password</Label>
          <Input
            id="deletePassword"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deletePhrase">Type DELETE</Label>
          <Input
            id="deletePhrase"
            value={confirmationPhrase}
            onChange={(event) => setConfirmationPhrase(event.target.value)}
            required
          />
        </div>
      </div>

      {error ? <p className="border border-error px-3 py-2 text-sm text-error">{error}</p> : null}

      <Button type="submit" variant="secondary" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Delete account
      </Button>
    </form>
  );
}
