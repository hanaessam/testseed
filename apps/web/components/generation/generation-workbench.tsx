"use client";

import { AgentDock, type AgentDockMessage } from "@/components/generation/agent-dock";
import {
  CollectionDataTable,
  type DatasetCellCommitPayload
} from "@/components/generation/collection-data-table";
import { CollectionCountsPanel } from "@/components/generation/collection-counts-panel";
import { ContextSourcesPanel } from "@/components/generation/context-sources-panel";
import { DatasetSaveBar } from "@/components/generation/dataset-save-bar";
import { ExportDrawer } from "@/components/generation/export-drawer";
import { GenerationPlanPanel } from "@/components/generation/generation-plan-panel";
import { GenerationProgress } from "@/components/generation/generation-progress";
import { SavedDatasetsPanel } from "@/components/generation/saved-datasets-panel";
import { SetupRail } from "@/components/generation/setup-rail";
import { Button } from "@/components/ui/button";
import { ValidationSummary } from "@/components/generation/validation-summary";
import { cn } from "@/src/lib/utils";
import type {
  CollectionProgress,
  PendingRegenerationCandidate
} from "@/src/lib/generation-workbench-state";
import type {
  GeneratedDataset,
  GenerationPlanResponse,
  GenerationValidationResult,
  ParsedSchema,
  ProjectContext,
  SavedGeneratedDatasetSummary
} from "@testseed/types";
import { Check, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";

interface GenerationWorkbenchProps {
  projectId?: string | null;
  token?: string | null;
  schemaSnapshotId?: string | null;
  context?: ProjectContext | null;
  schema?: ParsedSchema | null;
  plan: GenerationPlanResponse | null;
  planIsLoading?: boolean;
  regenerationLifecycle?:
    | "idle"
    | "submitted"
    | "in_progress"
    | "accepted"
    | "partial"
    | "rejected"
    | "cancelled"
    | "failed";
  dataset: GeneratedDataset | null;
  validationResults?: GenerationValidationResult[];
  progress?: CollectionProgress[];
  setupRailExpanded: boolean;
  onSetupRailExpandedChange(expanded: boolean): void;
  agentMessages: AgentDockMessage[];
  onAgentSubmit(message: string): void;
  agentBusy?: boolean;
  pendingCandidate?: PendingRegenerationCandidate | null;
  onAcceptCandidate?(): void;
  onRejectCandidate?(): void;
  isAcceptingCandidate?: boolean;
  quickPromptChips?: string[];
  setupContent: ReactNode;
  activeCollection?: string;
  onActiveCollectionChange?(collectionName: string): void;
  showExport?: boolean;
  exportOpen?: boolean;
  onExportOpenChange?(isOpen: boolean): void;
  savedDatasets?: SavedGeneratedDatasetSummary[];
  savedDatasetsLoading?: boolean;
  activeSavedDatasetId?: string | null;
  onSavedDatasetSelect?(datasetId: string): void;
  onGenerate?(): void;
  generateDisabled?: boolean;
  isGenerating?: boolean;
  collectionCounts?: Record<string, number>;
  onCollectionCountChange?(collectionName: string, count: number): void;
  countsDisabled?: boolean;
  editingDisabled?: boolean;
  editedCellKeys?: Set<string>;
  onCellCommit?(payload: DatasetCellCommitPayload): void;
  hasUnsavedEdits?: boolean;
  canSaveDataset?: boolean;
  isSavingDataset?: boolean;
  onSaveDataset?(): void;
  onSaveDatasetAsNew?(): void;
  onNavigateToValidationIssue?(issue: GenerationValidationResult): void;
  className?: string;
}

export function GenerationWorkbench({
  projectId,
  token,
  schemaSnapshotId,
  context,
  schema,
  plan,
  planIsLoading = false,
  regenerationLifecycle = "idle",
  dataset,
  validationResults = [],
  progress = [],
  setupRailExpanded,
  onSetupRailExpandedChange,
  agentMessages,
  onAgentSubmit,
  agentBusy = false,
  pendingCandidate = null,
  onAcceptCandidate,
  onRejectCandidate,
  isAcceptingCandidate = false,
  quickPromptChips,
  setupContent,
  activeCollection,
  onActiveCollectionChange,
  showExport = false,
  exportOpen = false,
  onExportOpenChange,
  savedDatasets = [],
  savedDatasetsLoading = false,
  activeSavedDatasetId = null,
  onSavedDatasetSelect,
  onGenerate,
  generateDisabled = false,
  isGenerating = false,
  collectionCounts = {},
  onCollectionCountChange,
  countsDisabled = false,
  editingDisabled = false,
  editedCellKeys = new Set<string>(),
  onCellCommit,
  hasUnsavedEdits = false,
  canSaveDataset = false,
  isSavingDataset = false,
  onSaveDataset,
  onSaveDatasetAsNew,
  onNavigateToValidationIssue,
  className
}: GenerationWorkbenchProps) {
  const errorCount = validationResults.filter((result) => result.severity === "error").length;
  const candidateErrorCount =
    pendingCandidate?.validationResults.filter((result) => result.severity === "error").length ?? 0;
  const candidateSummary = pendingCandidate?.candidateReview?.changeSummary;
  const candidateCanBeAccepted =
    pendingCandidate !== null &&
    pendingCandidate.dataset.status === "valid" &&
    candidateErrorCount === 0;
  const datasetIsValid = Boolean(dataset && dataset.status === "valid" && errorCount === 0);
  const lifecycleLabel =
    regenerationLifecycle === "in_progress"
      ? "Regeneration in progress"
      : regenerationLifecycle === "submitted"
        ? "Regeneration submitted"
        : regenerationLifecycle === "accepted"
          ? "Feedback accepted"
          : regenerationLifecycle === "partial"
            ? "Partial result"
            : regenerationLifecycle === "rejected"
              ? "Regeneration rejected"
              : regenerationLifecycle === "cancelled"
                ? "Regeneration cancelled"
                : regenerationLifecycle === "failed"
                  ? "Regeneration failed"
                  : null;
  const lifecycleSummary =
    regenerationLifecycle === "accepted"
      ? pendingCandidate
        ? "Feedback produced a schema-valid candidate. Review the changes before accepting it."
        : "Feedback was accepted and saved as the active dataset."
      : regenerationLifecycle === "partial"
        ? "Feedback was partially applied. Some requested changes were skipped to preserve constraints."
        : regenerationLifecycle === "rejected"
          ? "Feedback was rejected to protect schema validity and reference integrity."
          : regenerationLifecycle === "cancelled"
            ? "Regeneration was cancelled. The last accepted dataset remains active."
            : regenerationLifecycle === "failed"
              ? "Regeneration failed. Adjust feedback and retry."
              : null;

  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden", className)}>
      {showExport && onExportOpenChange ? (
        <div className="shrink-0">
          <ExportDrawer
            projectId={projectId}
            token={token}
            schemaSnapshotId={schemaSnapshotId}
            dataset={dataset}
            collectionCounts={collectionCounts}
            validationResults={validationResults}
            isOpen={exportOpen}
            onOpenChange={onExportOpenChange}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "grid h-full min-h-0 flex-1 gap-4 overflow-hidden",
          "max-md:grid-rows-[minmax(0,34vh)_minmax(0,1fr)_minmax(0,30vh)]",
          "md:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,300px)] md:grid-rows-1"
        )}
      >
        <aside className="flex min-h-0 flex-col overflow-hidden md:h-full">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
            <SetupRail expanded={setupRailExpanded} onExpandedChange={onSetupRailExpandedChange}>
              {setupContent}
            </SetupRail>
            <ContextSourcesPanel context={context} />
            {onCollectionCountChange ? (
              <CollectionCountsPanel
                schema={schema}
                plan={plan}
                collectionCounts={collectionCounts}
                onCollectionCountChange={onCollectionCountChange}
                disabled={countsDisabled}
              />
            ) : null}
            <GenerationPlanPanel
              plan={plan}
              isLoading={planIsLoading}
              riskLevel={plan?.riskLevel}
              blockingWarnings={plan?.blockingWarnings}
            />
            {onSavedDatasetSelect ? (
              <SavedDatasetsPanel
                datasets={savedDatasets}
                activeDatasetId={activeSavedDatasetId}
                isLoading={savedDatasetsLoading}
                onSelect={onSavedDatasetSelect}
              />
            ) : null}
          </div>
        </aside>

        <main className="min-h-0 overflow-y-auto overscroll-contain md:h-full md:pr-1">
          <div className="flex flex-col gap-3 pb-1">
            {progress.length > 0 ? <GenerationProgress className="shrink-0" items={progress} /> : null}

            {dataset ? (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    datasetIsValid
                      ? "border-accent/30 bg-accent/10 text-accent"
                      : "border-danger-border bg-danger-subtle text-danger-text"
                  )}
                >
                  {datasetIsValid ? "Dataset valid" : "Dataset invalid"}
                </span>
                {errorCount > 0 ? (
                  <span className="inline-flex items-center rounded-full border border-danger-border bg-danger-subtle px-2.5 py-1 text-[11px] font-medium text-danger-text">
                    {errorCount} validation {errorCount === 1 ? "issue" : "issues"}
                  </span>
                ) : null}
                {lifecycleLabel ? (
                  <span className="inline-flex items-center rounded-full border border-info-border bg-info-subtle px-2.5 py-1 text-[11px] font-medium text-info-text">
                    {lifecycleLabel}
                  </span>
                ) : null}
              </div>
            ) : null}

            {lifecycleSummary ? (
              <div className="rounded-md border border-info-border bg-info-subtle px-3 py-2 text-xs text-info-text">
                {lifecycleSummary}
              </div>
            ) : null}

            {pendingCandidate ? (
              <section className="rounded-md border border-info-border bg-info-subtle px-3 py-3 text-sm text-info-text">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        Regenerated candidate pending review
                      </h2>
                      <p className="mt-1 text-xs leading-5 text-info-text">
                        The accepted dataset is still active. Accept this candidate to save it as the
                        durable dataset, or reject it and revise feedback.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md border border-info-border bg-background/50 px-2 py-1">
                        {candidateSummary?.status ?? pendingCandidate.candidateReview?.state ?? "pending_review"}
                      </span>
                      <span className="rounded-md border border-info-border bg-background/50 px-2 py-1">
                        {candidateSummary?.collectionsChanged.length ?? 0} collections changed
                      </span>
                      {candidateErrorCount > 0 ? (
                        <span className="rounded-md border border-danger-border bg-danger-subtle px-2 py-1 text-danger-text">
                          {candidateErrorCount} validation {candidateErrorCount === 1 ? "issue" : "issues"}
                        </span>
                      ) : null}
                    </div>

                    {candidateSummary ? (
                      <div className="grid gap-2 text-xs md:grid-cols-2">
                        <div>
                          <p className="font-medium text-foreground">Changed collections</p>
                          <p className="mt-1 leading-5">
                            {candidateSummary.collectionsChanged.length > 0
                              ? candidateSummary.collectionsChanged.join(", ")
                              : "No collection-level changes."}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Notable fields</p>
                          <p className="mt-1 leading-5">
                            {candidateSummary.notableFieldsChanged.length > 0
                              ? candidateSummary.notableFieldsChanged
                                  .slice(0, 6)
                                  .map(
                                    (field) =>
                                      `${field.collectionName}.${field.fieldName} (${field.count})`
                                  )
                                  .join(", ")
                              : "No notable field changes."}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      onClick={onAcceptCandidate}
                      disabled={!candidateCanBeAccepted || isAcceptingCandidate}
                    >
                      {isAcceptingCandidate ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Accept
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onRejectCandidate}
                      disabled={isAcceptingCandidate}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </section>
            ) : null}

            {onSaveDataset && onSaveDatasetAsNew ? (
              <DatasetSaveBar
                hasUnsavedEdits={hasUnsavedEdits}
                canSave={canSaveDataset}
                isSaving={isSavingDataset}
                hasActiveSavedRun={Boolean(activeSavedDatasetId)}
                onSave={onSaveDataset}
                onSaveAsNew={onSaveDatasetAsNew}
              />
            ) : null}

            <ValidationSummary
              validationResults={validationResults}
              onNavigateToIssue={onNavigateToValidationIssue}
            />

            <CollectionDataTable
              dataset={dataset}
              regenerationLifecycle={regenerationLifecycle}
              schema={schema}
              validationResults={validationResults}
              activeCollection={activeCollection}
              onActiveCollectionChange={onActiveCollectionChange}
              onGenerate={onGenerate}
              generateDisabled={generateDisabled}
              isGenerating={isGenerating}
              editingDisabled={editingDisabled}
              editedCellKeys={editedCellKeys}
              onCellCommit={onCellCommit}
            />
          </div>
        </main>

        <aside className="flex min-h-0 flex-col overflow-hidden md:h-full">
          <AgentDock
            className="h-full min-h-0"
            dataset={dataset}
            messages={agentMessages}
            isSubmitting={agentBusy}
            quickPromptChips={quickPromptChips}
            disabledReason={
              pendingCandidate
                ? "Accept or reject the pending regenerated candidate before sending more feedback."
                : undefined
            }
            candidateReviewSummary={
              candidateSummary
                ? {
                    appliedFeedbackSummary: candidateSummary.appliedFeedbackSummary,
                    skippedFeedbackSummary: candidateSummary.skippedFeedbackSummary
                  }
                : undefined
            }
            onSubmit={onAgentSubmit}
          />
        </aside>
      </div>
    </div>
  );
}
