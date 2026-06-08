"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ReactNode } from "react";

interface SetupRailProps {
  title?: string;
  description?: string;
  expanded: boolean;
  onExpandedChange(expanded: boolean): void;
  children: ReactNode;
  className?: string;
}

export function SetupRail({
  title = "Setup",
  description = "Keep context, schema, and planning controls close without leaving the workbench.",
  expanded,
  onExpandedChange,
  children,
  className
}: SetupRailProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden transition-all",
        expanded ? "w-full" : "w-full",
        className
      )}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-expanded={expanded}
            onClick={() => onExpandedChange(!expanded)}
          >
            {expanded ? (
              <>
                <PanelLeftClose className="h-4 w-4" />
                Collapse
              </>
            ) : (
              <>
                <PanelLeftOpen className="h-4 w-4" />
                Expand
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {expanded ? <CardContent>{children}</CardContent> : null}
      {!expanded ? (
        <div className="border-t border-border px-4 py-3 text-xs text-muted">
          Setup is collapsed to give the data canvas more space.
        </div>
      ) : null}
    </Card>
  );
}
