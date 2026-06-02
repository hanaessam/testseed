import { cn } from "@/src/lib/utils";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-72 w-full resize-none border border-border bg-background p-3 font-mono text-sm leading-6 text-foreground outline-none transition-shadow placeholder:text-muted focus:border-accent focus:shadow-focus",
        className
      )}
      {...props}
    />
  );
}
