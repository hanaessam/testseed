"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/src/lib/utils";
import type { GenerationValidationResult } from "@testseed/types";

interface ValidationSummaryProps {
  validationResults: GenerationValidationResult[];
  onNavigateToIssue?(issue: GenerationValidationResult): void;
  className?: string;
}

export function ValidationSummary({
  validationResults,
  onNavigateToIssue,
  className
}: ValidationSummaryProps) {
  const errors = validationResults.filter((result) => result.severity === "error");

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className={cn("rounded-md border border-danger-border bg-danger-subtle/40 p-3", className)}>
      <p className="text-xs font-semibold text-danger-text">
        {errors.length} validation {errors.length === 1 ? "issue" : "issues"}
      </p>
      <ul className="mt-2 space-y-2">
        {errors.map((issue, index) => (
          <li key={`${issue.code}-${issue.fieldName ?? "field"}-${index}`} className="text-xs leading-5 text-foreground">
            <div className="flex items-start justify-between gap-2">
              <span>
                {issue.collectionName ? `${issue.collectionName}.` : ""}
                {issue.fieldName ?? "dataset"}: {issue.message}
              </span>
              {onNavigateToIssue ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto px-2 py-1 text-[11px]"
                  onClick={() => onNavigateToIssue(issue)}
                >
                  View
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
