"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { exportJavaScriptSeedScript } from "@/src/lib/api-client";
import { cn } from "@/src/lib/utils";
import type { GeneratedDataset, GenerationValidationResult } from "@testseed/types";
import { Copy, Download, FileCode2, FileJson, Loader2 } from "lucide-react";
import { useState } from "react";

interface ExportDrawerProps {
  projectId?: string | null;
  token?: string | null;
  schemaSnapshotId?: string | null;
  dataset: GeneratedDataset | null;
  collectionCounts?: Record<string, number>;
  validationResults?: GenerationValidationResult[];
  isOpen: boolean;
  onOpenChange(isOpen: boolean): void;
  className?: string;
}

export function ExportDrawer({
  projectId,
  token,
  schemaSnapshotId,
  dataset,
  collectionCounts,
  validationResults = [],
  isOpen,
  onOpenChange,
  className
}: ExportDrawerProps) {
  const [scriptPreview, setScriptPreview] = useState("");
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [isScriptExporting, setIsScriptExporting] = useState(false);
  const isInvalid =
    !dataset ||
    dataset.status !== "valid" ||
    validationResults.some((result) => result.severity === "error");
  const scriptExportUnavailable = isInvalid || !projectId || !token || !schemaSnapshotId;
  const jsonPayload = dataset ? JSON.stringify(dataset.collections, null, 2) : "";

  const downloadTextFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleJsonDownload = () => {
    if (!dataset || isInvalid) {
      return;
    }

    downloadTextFile(jsonPayload, `testseed-${dataset.projectId}-dataset.json`, "application/json");
  };

  const handleJsonCopy = async () => {
    if (!dataset || isInvalid) {
      return;
    }

    await navigator.clipboard.writeText(jsonPayload);
  };

  const loadJavaScriptSeedScript = async () => {
    if (!dataset || scriptExportUnavailable || !projectId || !token || !schemaSnapshotId) {
      return null;
    }

    setIsScriptExporting(true);
    setScriptError(null);

    try {
      const result = await exportJavaScriptSeedScript(
        projectId,
        {
          schemaSnapshotId,
          collectionCounts: collectionCounts ?? dataset.collectionCounts,
          dataset
        },
        token
      );
      setScriptPreview(result.script);
      return result.script;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not export the JavaScript seed script.";
      setScriptError(message);
      return null;
    } finally {
      setIsScriptExporting(false);
    }
  };

  const handleScriptDownload = async () => {
    const script = await loadJavaScriptSeedScript();
    if (!script || !dataset) {
      return;
    }

    downloadTextFile(script, `testseed-${dataset.projectId}-seed.js`, "text/javascript");
  };

  const handleScriptCopy = async () => {
    const script = await loadJavaScriptSeedScript();
    if (!script) {
      return;
    }

    await navigator.clipboard.writeText(script);
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-end">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(!isOpen)}>
          <FileJson className="h-4 w-4" />
          {isOpen ? "Hide export" : "Export"}
        </Button>
      </div>

      {isOpen ? (
        <Card className="mt-3 overflow-hidden">
          <CardHeader className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Export dataset</h2>
            <p className="text-xs leading-5 text-muted">
              Download JSON or a ready-to-run JavaScript seed script.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInvalid ? (
              <Alert tone="warning" title="Export unavailable">
                Export is disabled until the dataset is valid and free of blocking validation
                errors.
              </Alert>
            ) : null}

            {scriptError ? (
              <Alert tone="warning" title="Script export unavailable">
                {scriptError}
              </Alert>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">JSON</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" disabled={isInvalid} onClick={handleJsonDownload}>
                    <Download className="h-4 w-4" />
                    Download JSON
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isInvalid}
                    onClick={handleJsonCopy}
                  >
                    <Copy className="h-4 w-4" />
                    Copy JSON
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">JavaScript</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    disabled={scriptExportUnavailable || isScriptExporting}
                    onClick={handleScriptDownload}
                  >
                    {isScriptExporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileCode2 className="h-4 w-4" />
                    )}
                    Download seed.js
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={scriptExportUnavailable || isScriptExporting}
                    onClick={handleScriptCopy}
                  >
                    <Copy className="h-4 w-4" />
                    Copy script
                  </Button>
                </div>
              </div>
            </div>

            <pre className="max-h-72 overflow-auto rounded-md border border-border bg-background/40 p-3 text-xs leading-5 text-muted">
              {scriptPreview || jsonPayload || "// No dataset available."}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
