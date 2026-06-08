import { cn } from "@/src/lib/utils";

type AlertTone = "neutral" | "info" | "success" | "warning" | "danger";

export function Alert({
  title,
  children,
  tone = "neutral",
  className
}: {
  title?: string;
  children?: React.ReactNode;
  tone?: AlertTone;
  className?: string;
}) {
  const toneClass = {
    neutral: "border-border bg-background/40 text-muted",
    info: "border-info-border bg-info-subtle text-info-text",
    success: "border-accent/30 bg-accent/10 text-accent",
    warning: "border-warning-border bg-warning-subtle text-warning-text",
    danger: "border-danger-border bg-danger-subtle text-danger-text"
  }[tone];

  return (
    <div className={cn("rounded-md border px-4 py-3 text-sm", toneClass, className)}>
      {title ? <p className="font-semibold text-foreground">{title}</p> : null}
      {children ? <div className={cn(title ? "mt-1" : "", "text-xs leading-5")}>{children}</div> : null}
    </div>
  );
}
