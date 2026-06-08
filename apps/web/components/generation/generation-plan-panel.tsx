"use client";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import type {
  GenerationPlanResponse,
  GenerationPlanRiskLevel,
  GenerationValidationResult
} from "@testseed/types";
import { AlertTriangle, ArrowRight, GitMerge, ShieldAlert } from "lucide-react";

interface GenerationPlanPanelProps {
  plan: GenerationPlanResponse | null;
  isLoading?: boolean;
  riskLevel?: GenerationPlanRiskLevel;
  blockingWarnings?: GenerationValidationResult[];
  className?: string;
}

export function GenerationPlanPanel({
  plan,
  isLoading = false,
  riskLevel,
  blockingWarnings,
  className
}: GenerationPlanPanelProps) {
  const effectiveRiskLevel = riskLevel ?? plan?.riskLevel ?? "none";
  const effectiveWarnings = blockingWarnings ?? plan?.blockingWarnings ?? [];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <GitMerge className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Generation plan</h2>
        </div>
        <p className="text-xs leading-5 text-muted">
          Review collection order, dependencies, and warnings before you generate.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 w-40 animate-pulse rounded bg-background/70" />
            <div className="h-20 animate-pulse rounded-md border border-border bg-background/50" />
            <div className="h-20 animate-pulse rounded-md border border-border bg-background/50" />
          </div>
        ) : null}

        {!isLoading && !plan ? (
          <Alert tone="info" title="No plan loaded">
            Save or review a schema and collection counts to display the generation plan.
          </Alert>
        ) : null}

        {!isLoading && plan ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-background/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted">Total records</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {plan.totalRecords.toLocaleString()}
                </p>
              </div>
              <div className="rounded-md border border-border bg-background/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted">Risk level</p>
                <div className="mt-1 flex items-center gap-2">
                  {effectiveRiskLevel === "elevated" ? (
                    <ShieldAlert className="h-4 w-4 text-warning-text" />
                  ) : (
                    <GitMerge className="h-4 w-4 text-accent" />
                  )}
                  <p className="text-sm font-semibold text-foreground">{effectiveRiskLevel}</p>
                </div>
              </div>
            </div>

            {effectiveRiskLevel === "elevated" ? (
              <Alert tone="warning" title="Proceed with caution">
                Blocking plan issues were detected. Generate remains available, but referential
                integrity may be at risk until these warnings are resolved.
              </Alert>
            ) : null}

            <div className="space-y-3">
              {plan.items.map((item) => (
                <div
                  key={item.collectionName}
                  className="rounded-md border border-border bg-background/40 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {item.dependencyOrder + 1}. {item.collectionName}
                      </p>
                      <p className="text-xs text-muted">
                        {item.count.toLocaleString()} requested records
                      </p>
                    </div>
                    <div className="rounded-full border border-border px-2 py-1 font-mono text-[11px] text-muted">
                      order {item.dependencyOrder + 1}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs uppercase tracking-wide text-muted">Reference fields</p>
                    {item.referenceFields.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.referenceFields.map((referenceField) => (
                          <div
                            key={`${item.collectionName}-${referenceField.fieldName}`}
                            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
                          >
                            <span className="font-mono text-accent">
                              {referenceField.fieldName}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted" />
                            <span>{referenceField.referencedCollection}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted">No collection references.</p>
                    )}
                  </div>

                  {item.warnings.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {item.warnings.map((warning, index) => (
                        <div
                          key={`${item.collectionName}-${warning.code}-${index}`}
                          className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-subtle px-3 py-2 text-xs text-warning-text"
                        >
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{warning.message}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {effectiveWarnings.length > 0 ? (
              <Alert tone="warning" title="Blocking warnings">
                <div className="space-y-2">
                  {effectiveWarnings.map((warning, index) => (
                    <div key={`${warning.code}-${index}`} className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{warning.message}</span>
                    </div>
                  ))}
                </div>
              </Alert>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
