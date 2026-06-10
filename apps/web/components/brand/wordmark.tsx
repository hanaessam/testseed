import { cn } from "@/src/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 font-mono text-sm font-semibold tracking-tight", className)}>
      <img
        src="/logo-light.svg"
        alt=""
        width={16}
        height={32}
        className="h-7 w-auto shrink-0 dark:hidden"
        aria-hidden
      />
      <img
        src="/logo-dark.svg"
        alt=""
        width={16}
        height={32}
        className="hidden h-7 w-auto shrink-0 dark:block"
        aria-hidden
      />
      <span>TestSeed</span>
    </div>
  );
}
