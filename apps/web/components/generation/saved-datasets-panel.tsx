"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/src/lib/utils";
import type { SavedGeneratedDatasetSummary } from "@testseed/types";
import {
  Clock3,
  Database,
  GitBranch,
  Loader2,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Wand2
} from "lucide-react";

interface SavedDatasetsPanelProps {
  datasets: SavedGeneratedDatasetSummary[];
  activeDatasetId?: string | null;
  isLoading?: boolean;
  reseedingDatasetId?: string | null;
  onSelect(datasetId: string): void;
  onReseed?(datasetId: string, summary: SavedGeneratedDatasetSummary): void;
  className?: string;
}

export function SavedDatasetsPanel({
  datasets,
  activeDatasetId,
  isLoading = false,
  reseedingDatasetId = null,
  onSelect,
  onReseed,
  className
}: SavedDatasetsPanelProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Dataset versions</h2>
        </div>
        <p className="text-xs leading-5 text-muted">
          Every refine, edit, and accept creates a new version. Load any version in the workbench or
          re-seed it to MongoDB.
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
            <p className="mt-2 text-sm font-medium text-foreground">No versions yet</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Generate seed data to create your first saved version for this project.
            </p>
          </div>
        ) : null}

        {!isLoading
          ? datasets.map((dataset) => {
              const isActive = dataset.id === activeDatasetId;
              const isReseeding = reseedingDatasetId === dataset.id;
              const collectionLabel = Object.entries(dataset.collectionCounts)
                .map(([name, count]) => `${name} ×${count}`)
                .join(", ");
              const displayTitle =
                dataset.versionLabel?.trim() ||
                (dataset.source === "refinement" ? "Refined dataset" : "Generated dataset");

              return (
                <div
                  key={dataset.id}
                  className={cn(
                    "rounded-lg border px-3 py-3 transition-colors",
                    isActive
                      ? "border-accent bg-accent/10"
                      : "border-border bg-background/40"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(dataset.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{displayTitle}</p>
                        <p className="mt-1 text-xs text-muted">
                          {dataset.totalRecords.toLocaleString()} records · {collectionLabel}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          sourceBadgeClass(dataset.source)
                        )}
                      >
                        {dataset.source === "refinement" ? (
                          <Wand2 className="h-3 w-3" />
                        ) : dataset.source === "manual_edit" ? (
                          <RotateCcw className="h-3 w-3" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        {sourceLabel(dataset.source)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3 w-3" />
                        {formatSavedAt(dataset.createdAt)}
                      </span>
                      {dataset.parentDatasetId ? (
                        <span className="inline-flex items-center gap-1.5">
                          <GitBranch className="h-3 w-3" />
                          from {shortId(dataset.parentDatasetId)}
                        </span>
                      ) : null}
                      {dataset.chatMessageCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare className="h-3 w-3" />
                          {dataset.chatMessageCount} chat{" "}
                          {dataset.chatMessageCount === 1 ? "message" : "messages"}
                        </span>
                      ) : null}
                    </div>
                  </button>

                  {onReseed ? (
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 px-2.5 text-xs"
                        disabled={isReseeding}
                        onClick={(event) => {
                          event.stopPropagation();
                          onReseed(dataset.id, dataset);
                        }}
                      >
                        {isReseeding ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Database className="h-3.5 w-3.5" />
                        )}
                        Re-seed
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })
          : null}
      </CardContent>
    </Card>
  );
}

function sourceLabel(source: SavedGeneratedDatasetSummary["source"]) {
  if (source === "refinement") {
    return "Refined";
  }
  if (source === "manual_edit") {
    return "Edited";
  }
  return "Generated";
}

function sourceBadgeClass(source: SavedGeneratedDatasetSummary["source"]) {
  if (source === "refinement") {
    return "border-border text-muted";
  }
  if (source === "manual_edit") {
    return "border-info-border text-info-text";
  }
  return "border-accent/30 text-accent";
}

function shortId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
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
