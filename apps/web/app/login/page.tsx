"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { resolveLoginReason } from "@/src/lib/auth-session.shared";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const loginReason = resolveLoginReason(searchParams.get("reason") ?? undefined);

  return <AuthCard mode="login" loginReason={loginReason} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthCard mode="login" />}>
      <LoginPageContent />
    </Suspense>
  );
}
