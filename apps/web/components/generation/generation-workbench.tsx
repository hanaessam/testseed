"use client";



import { AgentDock, type AgentDockMessage } from "@/components/generation/agent-dock";

import { CollectionDataTable } from "@/components/generation/collection-data-table";

import { CollectionCountsPanel } from "@/components/generation/collection-counts-panel";
import { ContextSourcesPanel } from "@/components/generation/context-sources-panel";

import { ExportDrawer } from "@/components/generation/export-drawer";

import { GenerationPlanPanel } from "@/components/generation/generation-plan-panel";

import { GenerationProgress } from "@/components/generation/generation-progress";

import { SavedDatasetsPanel } from "@/components/generation/saved-datasets-panel";

import { SetupRail } from "@/components/generation/setup-rail";

import { cn } from "@/src/lib/utils";

import type { CollectionProgress } from "@/src/lib/generation-workbench-state";

import type {

  GeneratedDataset,

  GenerationPlanResponse,

  GenerationValidationResult,

  ParsedSchema,

  ProjectContext,

  SavedGeneratedDatasetSummary

} from "@testseed/types";

import type { ReactNode } from "react";



interface GenerationWorkbenchProps {

  context?: ProjectContext | null;

  schema?: ParsedSchema | null;

  plan: GenerationPlanResponse | null;

  planIsLoading?: boolean;

  dataset: GeneratedDataset | null;

  validationResults?: GenerationValidationResult[];

  progress?: CollectionProgress[];

  setupRailExpanded: boolean;

  onSetupRailExpandedChange(expanded: boolean): void;

  agentMessages: AgentDockMessage[];

  onAgentSubmit(message: string): void;

  agentBusy?: boolean;

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

  className?: string;

}



export function GenerationWorkbench({

  context,

  schema,

  plan,

  planIsLoading = false,

  dataset,

  validationResults = [],

  progress = [],

  setupRailExpanded,

  onSetupRailExpandedChange,

  agentMessages,

  onAgentSubmit,

  agentBusy = false,

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

  className

}: GenerationWorkbenchProps) {

  return (

    <div className={cn("flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden", className)}>

      {showExport && onExportOpenChange ? (

        <div className="shrink-0">

          <ExportDrawer

            dataset={dataset}

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

            <SetupRail

              expanded={setupRailExpanded}

              onExpandedChange={onSetupRailExpandedChange}

            >

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



            <CollectionDataTable

              dataset={dataset}

              schema={schema}

              validationResults={validationResults}

              activeCollection={activeCollection}

              onActiveCollectionChange={onActiveCollectionChange}

              onGenerate={onGenerate}

              generateDisabled={generateDisabled}

              isGenerating={isGenerating}

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

            onSubmit={onAgentSubmit}

          />

        </aside>

      </div>

    </div>

  );

}


