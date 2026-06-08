"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/src/lib/utils";
import type { SavedGeneratedDatasetSummary } from "@testseed/types";
import { Clock3, Database, MessageSquare, Sparkles, Wand2 } from "lucide-react";

interface SavedDatasetsPanelProps {
  datasets: SavedGeneratedDatasetSummary[];
  activeDatasetId?: string | null;
  isLoading?: boolean;
  onSelect(datasetId: string): void;
  className?: string;
}

export function SavedDatasetsPanel({
  datasets,
  activeDatasetId,
  isLoading = false,
  onSelect,
  className
}: SavedDatasetsPanelProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Saved runs</h2>
        </div>
        <p className="text-xs leading-5 text-muted">
          Each run stores generated data, collection counts, and refinement chat history. Select a
          run to restore the full workbench context.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : null}

        {!isLoading && datasets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background/40 px-3 py-4 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-accent" />
            <p className="mt-2 text-sm font-medium text-foreground">No saved runs yet</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Generate seed data to create your first saved preview for this project.
            </p>
          </div>
        ) : null}

        {!isLoading
          ? datasets.map((dataset) => {
              const isActive = dataset.id === activeDatasetId;
              const collectionLabel = Object.entries(dataset.collectionCounts)
                .map(([name, count]) => `${name} ×${count}`)
                .join(", ");

              return (
                <button
                  key={dataset.id}
                  type="button"
                  onClick={() => onSelect(dataset.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                    isActive
                      ? "border-accent bg-accent/10"
                      : "border-border bg-background/40 hover:border-accent/60 hover:bg-accent/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {dataset.totalRecords.toLocaleString()} records
                      </p>
                      <p className="mt-1 truncate text-xs text-muted">{collectionLabel}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        dataset.source === "refinement"
                          ? "border-border text-muted"
                          : "border-accent/30 text-accent"
                      )}
                    >
                      {dataset.source === "refinement" ? (
                        <Wand2 className="h-3 w-3" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {dataset.source === "refinement" ? "Refined" : "Generated"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3 w-3" />
                      {formatSavedAt(dataset.createdAt)}
                    </span>
                    {dataset.chatMessageCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" />
                        {dataset.chatMessageCount} chat{" "}
                        {dataset.chatMessageCount === 1 ? "message" : "messages"}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })
          : null}
      </CardContent>
    </Card>
  );
}

function formatSavedAt(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
