"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildDirectSeedConfirmation,
  executeDirectSeed,
  exportJavaScriptSeedScript,
  rollbackSeedBatch,
  testDirectSeedConnection
} from "@/src/lib/api-client";
import { cn } from "@/src/lib/utils";
import type {
  DirectMongoConnectionTestResult,
  DirectSeedingConfirmationSummary,
  DirectSeedingExecuteApiResponse,
  DirectSeedingReport,
  GeneratedDataset,
  GenerationValidationResult,
  RollbackSeedBatchResponse
} from "@testseed/types";
import { CheckCircle2, Copy, Database, Download, FileCode2, FileJson, Loader2, X } from "lucide-react";
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
  const [directSeedConnection, setDirectSeedConnection] = useState("");
  const [connectionTest, setConnectionTest] = useState<DirectMongoConnectionTestResult | null>(null);
  const [confirmation, setConfirmation] = useState<DirectSeedingConfirmationSummary | null>(null);
  const [directSeedReport, setDirectSeedReport] = useState<DirectSeedingReport | null>(null);
  const [directSeedError, setDirectSeedError] = useState<string | null>(null);
  const [directSeedHistoryWarning, setDirectSeedHistoryWarning] = useState<string | null>(null);
  const [rollbackResult, setRollbackResult] = useState<RollbackSeedBatchResponse | null>(null);
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isPreparingDirectSeed, setIsPreparingDirectSeed] = useState(false);
  const [isSeedingDirectly, setIsSeedingDirectly] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const isInvalid =
    !dataset ||
    dataset.status !== "valid" ||
    validationResults.some((result) => result.severity === "error");
  const scriptExportUnavailable = isInvalid || !projectId || !token || !schemaSnapshotId;
  const directSeedUnavailable = isInvalid || !projectId || !token || !schemaSnapshotId;
  const canPrepareDirectSeed =
    !directSeedUnavailable &&
    Boolean(dataset && connectionTest?.ok && connectionTest.connectionTestToken && connectionTest.databaseName);
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

  const handleDirectSeedConnectionChange = (value: string) => {
    setDirectSeedConnection(value);
    setConnectionTest(null);
    setConfirmation(null);
    setDirectSeedReport(null);
    setDirectSeedError(null);
    setDirectSeedHistoryWarning(null);
    setRollbackResult(null);
    setRollbackError(null);
  };

  const handleDirectSeedConnectionTest = async () => {
    if (!projectId || !token || !directSeedConnection.trim()) {
      return;
    }

    setIsTestingConnection(true);
    setConnectionTest(null);
    setConfirmation(null);
    setDirectSeedReport(null);
    setDirectSeedError(null);
    setDirectSeedHistoryWarning(null);
    setRollbackResult(null);
    setRollbackError(null);

    try {
      const result = await testDirectSeedConnection(
        projectId,
        { connectionString: directSeedConnection },
        token
      );
      setConnectionTest(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection test failed.";
      setConnectionTest({ ok: false, message });
      setDirectSeedError(message);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handlePrepareDirectSeed = async () => {
    if (
      !dataset ||
      !projectId ||
      !token ||
      !schemaSnapshotId ||
      !connectionTest?.connectionTestToken ||
      !connectionTest.databaseName
    ) {
      return;
    }

    setIsPreparingDirectSeed(true);
    setDirectSeedError(null);
    setDirectSeedReport(null);
    setDirectSeedHistoryWarning(null);
    setRollbackResult(null);
    setRollbackError(null);

    try {
      const summary = await buildDirectSeedConfirmation(
        projectId,
        {
          schemaSnapshotId,
          connectionTestToken: connectionTest.connectionTestToken,
          targetDatabaseName: connectionTest.databaseName,
          dataset
        },
        token
      );
      setConfirmation(summary);
    } catch (error) {
      setDirectSeedError(
        error instanceof Error ? error.message : "Could not prepare direct seeding confirmation."
      );
    } finally {
      setIsPreparingDirectSeed(false);
    }
  };

  const handleCancelDirectSeed = () => {
    setConfirmation(null);
    setDirectSeedError(null);
    setDirectSeedHistoryWarning(null);
    setRollbackError(null);
  };

  const handleConfirmDirectSeed = async () => {
    if (
      !dataset ||
      !projectId ||
      !token ||
      !schemaSnapshotId ||
      !confirmation ||
      !connectionTest?.connectionTestToken
    ) {
      return;
    }

    setIsSeedingDirectly(true);
    setDirectSeedError(null);
    setDirectSeedReport(null);
    setDirectSeedHistoryWarning(null);
    setRollbackResult(null);
    setRollbackError(null);

    try {
      const result = await executeDirectSeed(
        projectId,
        {
          schemaSnapshotId,
          connectionString: directSeedConnection,
          connectionTestToken: connectionTest.connectionTestToken,
          targetDatabaseName: confirmation.targetDatabaseName,
          dataset,
          confirmed: true
        },
        token
      );
      const report = normalizeDirectSeedReport(result);
      if (!report) {
        throw new Error("Direct seeding completed, but the API response did not include an insertion report.");
      }
      setConfirmation(null);
      setDirectSeedReport(report);
      setDirectSeedHistoryWarning(result.historyWarning ?? null);
    } catch (error) {
      setDirectSeedError(error instanceof Error ? error.message : "Direct seeding failed.");
    } finally {
      setIsSeedingDirectly(false);
    }
  };

  const handleRollbackDirectSeed = async () => {
    if (!projectId || !token || !directSeedReport || !directSeedConnection.trim()) {
      return;
    }

    const confirmed = window.confirm(
      `Roll back seed batch ${directSeedReport.seedBatchId}? This deletes inserted records tagged with this batch.`
    );
    if (!confirmed) {
      return;
    }

    setIsRollingBack(true);
    setRollbackError(null);

    try {
      const result = await rollbackSeedBatch(
        projectId,
        {
          seedBatchId: directSeedReport.seedBatchId,
          mongoUri: directSeedConnection
        },
        token
      );
      setRollbackResult(result);
    } catch (error) {
      setRollbackError(error instanceof Error ? error.message : "Rollback failed.");
    } finally {
      setIsRollingBack(false);
    }
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

            <div className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    Direct MongoDB Seed
                  </p>
                  <Input
                    type="password"
                    autoComplete="off"
                    value={directSeedConnection}
                    onChange={(event) => handleDirectSeedConnectionChange(event.target.value)}
                    placeholder="MongoDB connection string"
                    disabled={directSeedUnavailable || isSeedingDirectly}
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      directSeedUnavailable ||
                      isTestingConnection ||
                      isSeedingDirectly ||
                      !directSeedConnection.trim()
                    }
                    onClick={handleDirectSeedConnectionTest}
                  >
                    {isTestingConnection ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4" />
                    )}
                    Test
                  </Button>
                  <Button
                    type="button"
                    disabled={!canPrepareDirectSeed || isPreparingDirectSeed || isSeedingDirectly}
                    onClick={handlePrepareDirectSeed}
                  >
                    {isPreparingDirectSeed ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Direct Seed
                  </Button>
                </div>
              </div>

              {connectionTest?.ok ? (
                <Alert tone="success" title="Connection ready" className="mt-3">
                  Target database:{" "}
                  <span className="font-mono text-foreground">{connectionTest.databaseName}</span>
                </Alert>
              ) : null}

              {directSeedError ? (
                <Alert tone="warning" title="Direct seed unavailable" className="mt-3">
                  {directSeedError}
                </Alert>
              ) : null}

              {confirmation ? (
                <div className="mt-3 rounded-md border border-warning-border bg-warning-subtle p-3 text-sm text-warning-text">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Confirm direct seed</p>
                        <p className="mt-1 text-xs leading-5">{confirmation.warning}</p>
                      </div>
                      <div className="grid gap-2 text-xs sm:grid-cols-2">
                        <div>
                          <p className="font-medium text-foreground">Target database</p>
                          <p className="mt-1 font-mono">{confirmation.targetDatabaseName}</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Total records</p>
                          <p className="mt-1">{confirmation.totalRecordCount}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">Collections</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {confirmation.orderedCollections.map((collectionName) => (
                            <div
                              key={collectionName}
                              className="flex items-center justify-between rounded-md border border-warning-border bg-background/50 px-2 py-1 text-xs"
                            >
                              <span>{collectionName}</span>
                              <span>{confirmation.collectionCounts[collectionName] ?? 0}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isSeedingDirectly}
                        onClick={handleCancelDirectSeed}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        disabled={isSeedingDirectly}
                        onClick={handleConfirmDirectSeed}
                      >
                        {isSeedingDirectly ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Database className="h-4 w-4" />
                        )}
                        Confirm
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {directSeedReport ? (
                <Alert
                  tone={directSeedReport.failedCollections.length > 0 ? "warning" : "success"}
                  title={
                    directSeedReport.failedCollections.length > 0
                      ? "Direct seeding partially completed"
                      : "Direct seeding completed"
                  }
                  className="mt-3"
                >
                  <div className="space-y-2">
                    <p>
                      seedBatchId:{" "}
                      <span className="font-mono text-foreground">
                        {directSeedReport.seedBatchId}
                      </span>
                    </p>
                    <p>
                      Inserted {directSeedReport.totalInsertedCount} records into{" "}
                      {directSeedReport.targetDatabaseName}.
                    </p>
                    {Object.keys(directSeedReport.insertedRecordCounts).length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {Object.entries(directSeedReport.insertedRecordCounts).map(
                          ([collectionName, count]) => (
                            <span
                              key={collectionName}
                              className="rounded-md border border-accent/30 bg-background/50 px-2 py-1"
                            >
                              {collectionName}: {count}
                            </span>
                          )
                        )}
                      </div>
                    ) : null}
                    {directSeedReport.failedCollections.length > 0 ? (
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">Failed collections</p>
                        {directSeedReport.failedCollections.map((collection) => (
                          <div
                            key={collection.collectionName}
                            className="rounded-md border border-warning-border bg-background/50 px-2 py-2"
                          >
                            <p className="font-medium text-foreground">
                              {collection.collectionName}: inserted {collection.insertedCount} of{" "}
                              {collection.requestedCount}
                            </p>
                            {collection.errorSummary ? (
                              <p className="mt-1 font-mono text-[11px] leading-5">
                                {collection.errorSummary}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {directSeedReport.rollback.collections.length > 0 ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p>
                          Rollback is available for {directSeedReport.rollback.collections.length}{" "}
                          inserted {directSeedReport.rollback.collections.length === 1 ? "collection" : "collections"}.
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isRollingBack || Boolean(rollbackResult)}
                          onClick={handleRollbackDirectSeed}
                        >
                          {isRollingBack ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                          Rollback
                        </Button>
                      </div>
                    ) : (
                      <p>No rollback is available because this operation inserted zero records.</p>
                    )}
                    {rollbackError ? <p className="text-danger-text">{rollbackError}</p> : null}
                    {rollbackResult ? (
                      <div className="rounded-md border border-accent/30 bg-background/50 px-2 py-2">
                        <p className="font-medium text-foreground">Rollback completed</p>
                        <p className="mt-1">
                          {Object.entries(rollbackResult.deletedCounts)
                            .map(([collectionName, count]) => `${collectionName}: ${count}`)
                            .join(", ")}
                        </p>
                      </div>
                    ) : null}
                    {directSeedHistoryWarning ? (
                      <p className="text-warning-text">{directSeedHistoryWarning}</p>
                    ) : null}
                  </div>
                </Alert>
              ) : null}
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

function normalizeDirectSeedReport(
  response: DirectSeedingExecuteApiResponse | DirectSeedingReport
): DirectSeedingReport | null {
  if ("report" in response) {
    return response.report;
  }

  if ("seedBatchId" in response && "insertedRecordCounts" in response) {
    return response;
  }

  return null;
}
