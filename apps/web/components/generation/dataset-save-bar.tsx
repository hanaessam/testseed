"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/src/lib/utils";

interface DatasetSaveBarProps {
  hasUnsavedEdits: boolean;
  canSave: boolean;
  isSaving?: boolean;
  hasActiveSavedRun: boolean;
  onSave(): void;
  onSaveAsNew(): void;
  className?: string;
}

export function DatasetSaveBar({
  hasUnsavedEdits,
  canSave,
  isSaving = false,
  hasActiveSavedRun,
  onSave,
  onSaveAsNew,
  className
}: DatasetSaveBarProps) {
  if (!hasUnsavedEdits && !canSave) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="text-xs text-muted">
        {hasUnsavedEdits ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Unsaved edits on the data canvas
          </span>
        ) : (
          "Dataset is ready to save."
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={!canSave || isSaving || !hasUnsavedEdits}
          onClick={onSave}
        >
          {hasActiveSavedRun ? "Save changes" : "Save dataset"}
        </Button>
        <Button
          type="button"
          disabled={!canSave || isSaving || !hasUnsavedEdits}
          onClick={onSaveAsNew}
        >
          Save as new run
        </Button>
      </div>
    </div>
  );
}
