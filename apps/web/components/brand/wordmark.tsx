import { cn } from "@/src/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-mono text-sm font-semibold tracking-tight", className)}>
      <span className="h-2 w-2 bg-accent" />
      <span>TestSeed</span>
    </div>
  );
}
