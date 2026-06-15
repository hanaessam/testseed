import type {
  ChatRefinementMessage,
  GeneratedDataset,
  Project,
  SavedGeneratedDataset,
  SavedGeneratedDatasetSource
} from "@testseed/types";
import { saveGeneratedDataset } from "./save-generated-dataset";

export interface ForkSavedGeneratedDatasetRequest {
  projectId: string;
  parentDatasetId: string;
  ownerId: string;
  dataset: GeneratedDataset;
  source?: SavedGeneratedDatasetSource;
  chatHistory?: ChatRefinementMessage[];
  versionLabel?: string;
}

export interface ForkSavedGeneratedDatasetDeps {
  findProjectById(projectId: string): Promise<Project | null>;
  findGeneratedDatasetById(
    projectId: string,
    datasetId: string
  ): Promise<SavedGeneratedDataset | null>;
  createGeneratedDatasetRecord(input: {
    projectId: string;
    actorId: string;
    schemaSnapshotId: string;
    status: GeneratedDataset["status"];
    source: SavedGeneratedDatasetSource;
    generationOrder: string[];
    collectionCounts: Record<string, number>;
    collections: GeneratedDataset["collections"];
    validationResults: GeneratedDataset["validationResults"];
    warnings: GeneratedDataset["warnings"];
    chatHistory: ChatRefinementMessage[];
    createdAt: Date;
    parentDatasetId?: string;
    versionLabel?: string;
  }): Promise<SavedGeneratedDataset>;
  appendProjectEvent(input: {
    projectId: string;
    actorId: string;
    kind: "generation_completed";
    message: string;
    payload?: Record<string, unknown>;
    createdAt: Date;
  }): Promise<unknown>;
  now?(): Date;
}

export async function forkSavedGeneratedDataset(
  request: ForkSavedGeneratedDatasetRequest,
  deps: ForkSavedGeneratedDatasetDeps
): Promise<SavedGeneratedDataset> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  const parent = await deps.findGeneratedDatasetById(request.projectId, request.parentDatasetId);
  if (!parent) {
    throw new Error(`Saved dataset ${request.parentDatasetId} was not found`);
  }

  if (request.dataset.projectId !== request.projectId) {
    throw new Error("Dataset projectId does not match the requested project.");
  }

  if (request.dataset.status !== "valid") {
    throw new Error("Only valid datasets can be saved.");
  }

  if (request.dataset.validationResults.some((result) => result.severity === "error")) {
    throw new Error("Resolve validation errors before saving edits.");
  }

  const source = request.source ?? "manual_edit";
  const chatHistory = request.chatHistory ?? parent.chatHistory;

  return saveGeneratedDataset(
    {
      projectId: request.projectId,
      ownerId: request.ownerId,
      dataset: request.dataset,
      source,
      chatHistory,
      parentDatasetId: request.parentDatasetId,
      versionLabel: request.versionLabel
    },
    deps
  );
}
