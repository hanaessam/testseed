"use client";

import { Alert } from "@/components/ui/alert";
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
    <form className="space-y-4" onSubmit={submit}>
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
          <Label htmlFor="deletePhrase">Type DELETE to confirm</Label>
          <Input
            id="deletePhrase"
            value={confirmationPhrase}
            onChange={(event) => setConfirmationPhrase(event.target.value)}
            placeholder="DELETE"
            className="font-mono"
            required
          />
        </div>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Button type="submit" variant="secondary" className="text-error" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Delete account
      </Button>
    </form>
  );
}
