"use client";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/src/lib/utils";
import type { GenerationPlanResponse, ParsedSchema } from "@testseed/types";
import { Hash } from "lucide-react";
import { useMemo } from "react";

const SAFE_GENERATION_LIMIT = 100;

interface CollectionCountsPanelProps {
  schema?: ParsedSchema | null;
  plan?: GenerationPlanResponse | null;
  collectionCounts: Record<string, number>;
  onCollectionCountChange(collectionName: string, count: number): void;
  disabled?: boolean;
  className?: string;
}

export function CollectionCountsPanel({
  schema,
  plan,
  collectionCounts,
  onCollectionCountChange,
  disabled = false,
  className
}: CollectionCountsPanelProps) {
  const collectionNames = useMemo(() => {
    if (plan?.orderedCollections.length) {
      return plan.orderedCollections;
    }

    return schema?.collections.map((collection) => collection.name) ?? [];
  }, [plan?.orderedCollections, schema?.collections]);

  const totalRecords = useMemo(
    () => Object.values(collectionCounts).reduce((sum, count) => sum + count, 0),
    [collectionCounts]
  );

  const exceedsSafeLimit = totalRecords > SAFE_GENERATION_LIMIT;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Collection counts</h2>
        </div>
        <p className="text-xs leading-5 text-muted">
          Set how many records to generate per collection. The generation plan updates as you edit
          counts.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!schema || collectionNames.length === 0 ? (
          <Alert tone="info" title="No schema loaded">
            Save a schema in the setup wizard to configure collection counts.
          </Alert>
        ) : (
          <>
            <div className="rounded-md border border-border bg-background/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted">Total records</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {totalRecords.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted">
                Safe limit: {SAFE_GENERATION_LIMIT.toLocaleString()} per generation request
              </p>
            </div>

            {exceedsSafeLimit ? (
              <Alert tone="warning" title="Count limit exceeded">
                Reduce counts or split generation into smaller batches before generating.
              </Alert>
            ) : null}

            {totalRecords === 0 ? (
              <Alert tone="warning" title="No records requested">
                Set at least one collection count above zero to generate seed data.
              </Alert>
            ) : null}

            <div className="space-y-3">
              {collectionNames.map((collectionName) => {
                const planItem = plan?.items.find((item) => item.collectionName === collectionName);
                const count = collectionCounts[collectionName] ?? 0;

                return (
                  <div
                    key={collectionName}
                    className="rounded-md border border-border bg-background/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Label
                          htmlFor={`count-${collectionName}`}
                          className="text-sm font-semibold text-foreground"
                        >
                          {collectionName}
                        </Label>
                        {planItem ? (
                          <p className="mt-1 text-xs text-muted">
                            Generation order {planItem.dependencyOrder + 1}
                          </p>
                        ) : null}
                      </div>
                      <Input
                        id={`count-${collectionName}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={Number.isFinite(count) ? count : 0}
                        disabled={disabled}
                        onChange={(event) => {
                          const parsed = Number.parseInt(event.target.value, 10);
                          onCollectionCountChange(
                            collectionName,
                            Number.isNaN(parsed) ? 0 : parsed
                          );
                        }}
                        className="h-9 w-24 shrink-0 text-right"
                        aria-label={`Record count for ${collectionName}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
