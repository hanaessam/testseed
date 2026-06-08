"use client";

import type { ReactNode } from "react";
import { StoreProvider } from "./store-provider";
import { ThemeSync } from "./theme-sync";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ThemeSync />
      {children}
    </StoreProvider>
  );
}
