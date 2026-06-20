import { cn } from "@/src/lib/utils";

/** Logo SVG viewBox is 478×966 (~0.495 width/height). */
const LOGO_ASPECT = 478 / 966;

type WordmarkSize = "sm" | "md" | "lg";

const sizeStyles: Record<WordmarkSize, string> = {
  sm: "text-sm",
  md: "text-[15px]",
  lg: "text-xl"
};

export function Wordmark({
  className,
  size = "sm",
  showMarkBackground = false
}: {
  className?: string;
  size?: WordmarkSize;
  showMarkBackground?: boolean;
}) {
  const logoHeightEm = 1.125;
  const logoWidthEm = logoHeightEm * LOGO_ASPECT;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-[0.45em] font-sans font-semibold leading-none tracking-tight",
        sizeStyles[size],
        className
      )}
    >
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center",
          showMarkBackground && "rounded-[0.25em] bg-accent/10"
        )}
        style={{
          height: `${logoHeightEm}em`,
          width: `${logoWidthEm}em`
        }}
      >
        <img
          src="/logo-light.svg"
          alt=""
          className="block h-full w-full object-contain object-center dark:hidden"
          aria-hidden
        />
        <img
          src="/logo-dark.svg"
          alt=""
          className="hidden h-full w-full object-contain object-center dark:block"
          aria-hidden
        />
      </span>
      <span className="translate-y-[0.03em]">
        <span className="text-foreground">Test</span>
        <span className="text-accent">Seed</span>
      </span>
    </div>
  );
}
