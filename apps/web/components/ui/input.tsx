import { cn } from "@/src/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full border border-border bg-surface px-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted focus:border-accent focus:shadow-focus",
        className
      )}
      {...props}
    />
  );
}
