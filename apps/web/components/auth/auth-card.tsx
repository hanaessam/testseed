"use client";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getGitHubAuthUrl, login, register } from "@/src/lib/api-client";
import { GitBranch } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface AuthCardProps {
  mode: "login" | "register";
}

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isRegister = mode === "register";

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const response = isRegister
        ? await register({ email, password })
        : await login({ email, password });
      window.localStorage.setItem("testseedToken", response.token);
      router.push("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  }

  function continueWithGitHub() {
    window.location.href = getGitHubAuthUrl();
  }

  return (
    <div className="terminal-grid flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardContent className="space-y-5 p-5">
          <div className="space-y-3">
            <Wordmark />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {isRegister ? "Create your workspace" : "Welcome back"}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {isRegister
                  ? "Tie generation sessions and seed batches to your account."
                  : "Access your TestSeed generation workspace."}
              </p>
            </div>
          </div>

          <Button type="button" variant="secondary" className="w-full" onClick={continueWithGitHub}>
            <GitBranch className="h-4 w-4" />
            Continue with GitHub
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            <span>or use email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={submitAuth}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="dev@testseed.local"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <span className="h-2 w-2 animate-pulse bg-accent-foreground" /> : null}
              {isRegister ? "Create account" : "Log in"}
            </Button>
          </form>

          {message ? <p className="border border-error px-3 py-2 text-sm text-error">{message}</p> : null}

          <p className="text-sm text-muted">
            {isRegister ? "Already have an account?" : "New to TestSeed?"}{" "}
            <Link className="text-accent transition-colors hover:text-foreground" href={isRegister ? "/login" : "/register"}>
              {isRegister ? "Log in" : "Create one"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
