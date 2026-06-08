"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { logout } from "@/src/lib/api-client";
import { clearStoredSession, getStoredAuthToken } from "@/src/lib/session";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton({
  className,
  variant = "secondary"
}: Pick<ButtonProps, "className" | "variant">) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    const token = getStoredAuthToken();

    try {
      if (token) {
        await logout(token);
      }
    } finally {
      clearStoredSession();
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Button
      className={className}
      variant={variant}
      onClick={handleLogout}
      disabled={isLoading}
    >
      <LogOut className="h-3.5 w-3.5" />
      {isLoading ? "..." : "Log out"}
    </Button>
  );
}
