"use client";

import { Button } from "@/components/ui/button";
import { logout } from "@/src/lib/api-client";
import { clearStoredSession, getStoredAuthToken } from "@/src/lib/session";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
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
    <Button className="mt-3 w-full" variant="secondary" onClick={handleLogout} disabled={isLoading}>
      <LogOut className="h-4 w-4" />
      {isLoading ? "Logging out" : "Log out"}
    </Button>
  );
}
