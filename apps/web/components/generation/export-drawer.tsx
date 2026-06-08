"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/src/lib/utils";
import type { GeneratedDataset, GenerationValidationResult } from "@testseed/types";
import { Copy, Download, FileJson } from "lucide-react";

interface ExportDrawerProps {
  dataset: GeneratedDataset | null;
  validationResults?: GenerationValidationResult[];
  isOpen: boolean;
  onOpenChange(isOpen: boolean): void;
  className?: string;
}

export function ExportDrawer({
  dataset,
  validationResults = [],
  isOpen,
  onOpenChange,
  className
}: ExportDrawerProps) {
  const isInvalid =
    !dataset ||
    dataset.status !== "valid" ||
    validationResults.some((result) => result.severity === "error");
  const jsonPayload = dataset ? JSON.stringify(dataset.collections, null, 2) : "";

  const handleDownload = () => {
    if (!dataset || isInvalid) {
      return;
    }

    const blob = new Blob([jsonPayload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `testseed-${dataset.projectId}-dataset.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!dataset || isInvalid) {
      return;
    }

    await navigator.clipboard.writeText(jsonPayload);
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-end">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(!isOpen)}>
          <FileJson className="h-4 w-4" />
          {isOpen ? "Hide export" : "Export JSON"}
        </Button>
      </div>

      {isOpen ? (
        <Card className="mt-3 overflow-hidden">
          <CardHeader className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Export dataset</h2>
            <p className="text-xs leading-5 text-muted">
              Download or copy grouped JSON when the current dataset passes validation.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInvalid ? (
              <Alert tone="warning" title="Export unavailable">
                Export is disabled until the dataset is valid and free of blocking validation
                errors.
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" disabled={isInvalid} onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Download JSON
              </Button>
              <Button type="button" variant="secondary" disabled={isInvalid} onClick={handleCopy}>
                <Copy className="h-4 w-4" />
                Copy JSON
              </Button>
            </div>

            <pre className="max-h-72 overflow-auto rounded-md border border-border bg-background/40 p-3 text-xs leading-5 text-muted">
              {jsonPayload || "// No dataset available."}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
