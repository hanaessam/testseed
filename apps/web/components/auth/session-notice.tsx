"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  getSessionNoticeMessage,
  type SessionLoginReason
} from "@/src/lib/auth-session.shared";
import { LogIn } from "lucide-react";
import Link from "next/link";

export function SessionNotice({
  reason,
  className
}: {
  reason: SessionLoginReason;
  className?: string;
}) {
  const message = getSessionNoticeMessage(reason);
  if (!message) {
    return null;
  }

  return (
    <Alert
      tone="warning"
      title={reason === "session_expired" ? "Session expired" : "Sign in required"}
      className={className}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{message}</p>
        <Button asChild className="shrink-0">
          <Link href={`/login?reason=${reason}`}>
            <LogIn className="h-4 w-4" />
            Sign in again
          </Link>
        </Button>
      </div>
    </Alert>
  );
}
