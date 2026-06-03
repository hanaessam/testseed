"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/src/lib/api-client";
import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsLoading(true);

    try {
      const response = await forgotPassword({ email });
      setMessage(response.message);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not request reset");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-5 p-5">
        <div>
          <p className="font-mono text-xs text-accent">auth.recovery</p>
          <h1 className="mt-2 text-xl font-semibold">Forgot password</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Enter your account email and use the code you receive to reset your password.
          </p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="forgotEmail">Email</Label>
            <Input
              id="forgotEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send reset code
          </Button>
        </form>

        {message ? <p className="border border-accent px-3 py-2 text-sm text-accent">{message}</p> : null}
        {error ? <p className="border border-error px-3 py-2 text-sm text-error">{error}</p> : null}

        <div className="flex justify-between text-sm">
          <Link className="text-accent hover:text-foreground" href="/reset-password">
            I have a code
          </Link>
          <Link className="text-muted hover:text-foreground" href="/login">
            Back to login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
