"use client";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getGitHubAuthUrl,
  login,
  requestRegistrationOtp,
  verifyRegistrationOtp
} from "@/src/lib/api-client";
import { saveAuthSession } from "@/src/lib/session";
import type { PasswordRuleResult } from "@testseed/types";
import { Check, Eye, EyeOff, GitBranch, KeyRound, Mail, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, type InputHTMLAttributes, useMemo, useState } from "react";

interface AuthCardProps {
  mode: "login" | "register";
}

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isRegister = mode === "register";
  const passwordRules = useMemo(
    () => getPasswordRules(password, confirmPassword),
    [password, confirmPassword]
  );
  const isPasswordValid = passwordRules.every((rule) => rule.passed);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const response = await login({ email, password });
      saveAuthSession(response);
      router.push("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccessMessage("");

    if (!isPasswordValid) {
      setMessage("Password does not meet the security requirements.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await requestRegistrationOtp({ email, password, confirmPassword });
      setIsOtpSent(true);
      setSuccessMessage(`Verification code sent to ${response.email}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send verification code");
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const response = await verifyRegistrationOtp({ email, otp });
      saveAuthSession(response);
      router.push("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not verify code");
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
                  ? "Verify your email before your account is created."
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

          {isRegister ? (
            <form className="space-y-4" onSubmit={isOtpSent ? verifyOtp : requestOtp}>
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
                  disabled={isOtpSent}
                />
              </div>

              {!isOtpSent ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <PasswordInput
                        id="password"
                        name="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="************"
                        required
                        isVisible={isPasswordVisible}
                        onToggleVisibility={() => setIsPasswordVisible((visible) => !visible)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm</Label>
                      <PasswordInput
                        id="confirmPassword"
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="************"
                        required
                        isVisible={isConfirmPasswordVisible}
                        onToggleVisibility={() =>
                          setIsConfirmPasswordVisible((visible) => !visible)
                        }
                      />
                    </div>
                  </div>

                  <div className="border border-border bg-background p-3">
                    <div className="mb-3 flex items-center gap-2 text-xs text-muted">
                      <KeyRound className="h-3.5 w-3.5 text-accent" />
                      Password policy
                    </div>
                    <div className="grid gap-2 text-xs sm:grid-cols-2">
                      {passwordRules.map((rule) => (
                        <PasswordRule key={rule.id} rule={rule} />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification code</Label>
                  <Input
                    id="otp"
                    name="otp"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    required
                  />
                  <p className="flex items-center gap-2 text-xs text-muted">
                    <Mail className="h-3.5 w-3.5 text-accent" />
                    Use the 6-digit code from your email.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <span className="h-2 w-2 animate-pulse bg-accent-foreground" /> : null}
                {isOtpSent ? "Verify code and create account" : "Send verification code"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={submitLogin}>
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
                <PasswordInput
                  id="password"
                  name="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  required
                  isVisible={isPasswordVisible}
                  onToggleVisibility={() => setIsPasswordVisible((visible) => !visible)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <span className="h-2 w-2 animate-pulse bg-accent-foreground" /> : null}
                Log in
              </Button>
              <div className="text-right">
                <Link
                  className="text-sm text-accent transition-colors hover:text-foreground"
                  href="/forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
            </form>
          )}

          {message ? <p className="border border-error px-3 py-2 text-sm text-error">{message}</p> : null}
          {successMessage ? (
            <p className="border border-accent px-3 py-2 text-sm text-accent">
              {successMessage}
            </p>
          ) : null}

          <p className="text-sm text-muted">
            {isRegister ? "Already have an account?" : "New to TestSeed?"}{" "}
            <Link
              className="text-accent transition-colors hover:text-foreground"
              href={isRegister ? "/login" : "/register"}
            >
              {isRegister ? "Log in" : "Create one"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  isVisible: boolean;
  onToggleVisibility(): void;
}

function PasswordInput({
  isVisible,
  onToggleVisibility,
  className,
  ...props
}: PasswordInputProps) {
  const Icon = isVisible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        {...props}
        type={isVisible ? "text" : "password"}
        className={`pr-10 ${className ?? ""}`}
      />
      <button
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center border border-transparent text-muted transition-colors hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:shadow-focus"
        onClick={onToggleVisibility}
      >
        <Icon className="h-4 w-4" />
      </button>
    </div>
  );
}

function PasswordRule({ rule }: { rule: PasswordRuleResult }) {
  const Icon = rule.passed ? Check : X;

  return (
    <div
      className={
        rule.passed ? "flex items-center gap-2 text-accent" : "flex items-center gap-2 text-muted"
      }
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{rule.label}</span>
    </div>
  );
}

function getPasswordRules(password: string, confirmPassword: string): PasswordRuleResult[] {
  return [
    {
      id: "minLength",
      label: "At least 12 characters",
      passed: password.length >= 12
    },
    {
      id: "uppercase",
      label: "One uppercase letter",
      passed: /[A-Z]/.test(password)
    },
    {
      id: "lowercase",
      label: "One lowercase letter",
      passed: /[a-z]/.test(password)
    },
    {
      id: "number",
      label: "One number",
      passed: /\d/.test(password)
    },
    {
      id: "special",
      label: "One special character",
      passed: /[^A-Za-z0-9]/.test(password)
    },
    {
      id: "match",
      label: "Passwords match",
      passed: password.length > 0 && password === confirmPassword
    }
  ];
}
