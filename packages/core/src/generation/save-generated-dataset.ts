import type {
  ChatRefinementMessage,
  GeneratedDataset,
  Project,
  SavedGeneratedDataset,
  SavedGeneratedDatasetSource
} from "@testseed/types";
import { sanitizePersistedChatHistory } from "./update-saved-generated-dataset-chat-history";

export interface SaveGeneratedDatasetRequest {
  projectId: string;
  ownerId: string;
  dataset: GeneratedDataset;
  source: SavedGeneratedDatasetSource;
  chatHistory?: ChatRefinementMessage[];
}

export interface SaveGeneratedDatasetDeps {
  now?(): Date;
  findProjectById(projectId: string): Promise<Project | null>;
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
  }): Promise<SavedGeneratedDataset>;
  appendProjectEvent(input: {
    projectId: string;
    actorId: string;
    kind: "generation_completed";
    message: string;
    payload?: Record<string, unknown>;
    createdAt: Date;
  }): Promise<unknown>;
}

export async function saveGeneratedDataset(
  request: SaveGeneratedDatasetRequest,
  deps: SaveGeneratedDatasetDeps
): Promise<SavedGeneratedDataset> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  if (request.dataset.projectId !== request.projectId) {
    throw new Error("Dataset projectId does not match the requested project.");
  }

  const now = deps.now?.() ?? new Date();
  const savedDataset = await deps.createGeneratedDatasetRecord({
    projectId: request.projectId,
    actorId: request.ownerId,
    schemaSnapshotId: request.dataset.schemaSnapshotId,
    status: request.dataset.status,
    source: request.source,
    generationOrder: request.dataset.generationOrder,
    collectionCounts: request.dataset.collectionCounts,
    collections: request.dataset.collections,
    validationResults: request.dataset.validationResults,
    warnings: request.dataset.warnings,
    chatHistory: sanitizePersistedChatHistory(request.chatHistory ?? []),
    createdAt: now
  });

  await deps.appendProjectEvent({
    projectId: request.projectId,
    actorId: request.ownerId,
    kind: "generation_completed",
    message:
      request.source === "refinement"
        ? "Saved refined dataset snapshot."
        : "Saved generated dataset snapshot.",
    payload: {
      savedDatasetId: savedDataset.id,
      collectionCounts: savedDataset.collectionCounts,
      generationOrder: savedDataset.generationOrder,
      source: request.source,
      chatMessageCount: savedDataset.chatHistory.length
    },
    createdAt: now
  });

  return savedDataset;
}
