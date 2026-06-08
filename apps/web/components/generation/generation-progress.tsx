"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import type { CollectionProgress } from "@/src/lib/generation-workbench-state";
import { CheckCircle2, CircleDashed, LoaderCircle, XCircle } from "lucide-react";

interface GenerationProgressProps {
  items: CollectionProgress[];
  className?: string;
}

export function GenerationProgress({ items, className }: GenerationProgressProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Generation progress</h2>
        <p className="text-xs leading-5 text-muted">
          Streaming status by collection as generation progresses.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const Icon = getStatusIcon(item.status);
          const toneClass = getToneClass(item.status);

          return (
            <div
              key={item.collectionName}
              className={cn(
                "flex items-center justify-between rounded-md border px-3 py-2",
                toneClass
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.collectionName}</p>
                  <p className="text-xs text-muted">
                    {item.rowsReceived.toLocaleString()} / {item.recordCount.toLocaleString()} rows
                  </p>
                </div>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
                {item.status}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function getStatusIcon(status: CollectionProgress["status"]) {
  switch (status) {
    case "in_progress":
      return LoaderCircle;
    case "complete":
      return CheckCircle2;
    case "failed":
      return XCircle;
    default:
      return CircleDashed;
  }
}

function getToneClass(status: CollectionProgress["status"]) {
  switch (status) {
    case "in_progress":
      return "border-info-border bg-info-subtle";
    case "complete":
      return "border-accent/20 bg-accent/10";
    case "failed":
      return "border-danger-border bg-danger-subtle";
    default:
      return "border-border bg-background/40";
  }
}
