import { cn } from "@/src/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-md border border-border bg-background/60 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent/60 focus:shadow-focus",
        className
      )}
      {...props}
    />
  );
}
