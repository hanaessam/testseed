"use client";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import type { ProjectContext } from "@testseed/types";
import { AlertTriangle, GitBranch, Sparkles } from "lucide-react";

interface ContextSourcesPanelProps {
  context?: ProjectContext | null;
  fallbackDescription?: string;
  genericWarningMessage?: string;
  className?: string;
}

export function ContextSourcesPanel({
  context,
  fallbackDescription,
  genericWarningMessage = "No project description or repository summary is available yet. Generation can still run, but results may be generic.",
  className
}: ContextSourcesPanelProps) {
  const description = context?.description?.trim() || fallbackDescription?.trim() || "";
  const repository = context?.repository;
  const hasDescription = description.length > 0;
  const hasRepository = Boolean(repository?.summary || repository?.repositoryFullName);
  const warnings = context?.warnings ?? [];
  const showGenericWarning = !hasDescription && !hasRepository;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Context sources</h2>
        </div>
        <p className="text-xs leading-5 text-muted">
          TestSeed will use any saved domain description and repository summary when it builds or
          refines the dataset.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-border bg-background/40 p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <p className="text-sm font-medium text-foreground">Project description</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            {hasDescription ? description : "No project description saved."}
          </p>
        </div>

        <div className="rounded-md border border-border bg-background/40 p-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-accent" />
            <p className="text-sm font-medium text-foreground">GitHub repository</p>
          </div>
          {repository ? (
            <>
              <p className="mt-2 text-xs font-medium text-foreground">
                {repository.repositoryFullName}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {repository.summary || "Repository connected, but no summary is available yet."}
              </p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                {repository.accessStatus}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted">
              No connected repository summary available.
            </p>
          )}
        </div>

        {showGenericWarning ? (
          <Alert tone="warning" title="Generic output warning">
            {genericWarningMessage}
          </Alert>
        ) : null}

        {warnings.length > 0 ? (
          <Alert tone="warning" title="Context warnings">
            <div className="space-y-2">
              {warnings.map((warning) => (
                <div key={warning.code} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
