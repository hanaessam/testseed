import type { ProjectContext } from "@testseed/types";
import { AlertCircle, GitBranch, Sparkles } from "lucide-react";

interface ProjectContextSummaryProps {
  context?: ProjectContext;
  fallbackDescription?: string;
}

export function ProjectContextSummary({
  context,
  fallbackDescription
}: ProjectContextSummaryProps) {
  const description = context?.description ?? fallbackDescription;
  const repository = context?.repository;
  const warnings = context?.warnings ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-md bg-background/50 p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <p className="text-sm font-medium">Domain context</p>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          {description || "No project description saved. Generated data may be generic."}
        </p>
      </div>

      {repository ? (
        <div className="rounded-md bg-background/50 p-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-accent" />
            <p className="text-sm font-medium">{repository.repositoryFullName}</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">{repository.summary}</p>
          <p className="mt-2 font-mono text-xs text-muted">{repository.accessStatus}</p>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="space-y-2">
          {warnings.map((warning) => (
            <div
              key={warning.code}
              className="flex items-start gap-2 border border-warning-border bg-warning-subtle p-2 text-xs text-warning-text"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{warning.message}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
