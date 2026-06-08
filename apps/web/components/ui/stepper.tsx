import { cn } from "@/src/lib/utils";

export interface StepperStep {
  id: string;
  title: string;
  description?: string;
}

export function Stepper({
  steps,
  activeStepId,
  className
}: {
  steps: StepperStep[];
  activeStepId: string;
  className?: string;
}) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === activeStepId)
  );

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step, idx) => {
          const state = idx < activeIndex ? "complete" : idx === activeIndex ? "active" : "upcoming";
          return (
            <div key={step.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                  state === "complete" && "border-accent/40 bg-accent/10 text-accent",
                  state === "active" && "border-accent bg-accent/15 text-accent shadow-focus",
                  state === "upcoming" && "border-border bg-surface text-muted"
                )}
              >
                {idx + 1}
              </div>
              <div className="hidden sm:block">
                <p
                  className={cn(
                    "text-xs font-semibold",
                    state === "active" ? "text-foreground" : "text-muted"
                  )}
                >
                  {step.title}
                </p>
                {step.description ? (
                  <p className="text-[11px] text-muted">{step.description}</p>
                ) : null}
              </div>
              {idx < steps.length - 1 ? <div className="h-px w-6 bg-border" /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

