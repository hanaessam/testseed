import type { GeneratedDataset, Project, SavedGeneratedDataset } from "@testseed/types";

export interface UpdateSavedGeneratedDatasetRequest {
  projectId: string;
  datasetId: string;
  ownerId: string;
  dataset: GeneratedDataset;
}

export interface UpdateSavedGeneratedDatasetDeps {
  findProjectById(projectId: string): Promise<Project | null>;
  findGeneratedDatasetById(
    projectId: string,
    datasetId: string
  ): Promise<SavedGeneratedDataset | null>;
  updateGeneratedDatasetRecord(input: {
    projectId: string;
    datasetId: string;
    status: GeneratedDataset["status"];
    generationOrder: string[];
    collectionCounts: Record<string, number>;
    collections: GeneratedDataset["collections"];
    validationResults: GeneratedDataset["validationResults"];
    warnings: GeneratedDataset["warnings"];
  }): Promise<SavedGeneratedDataset | null>;
}

export async function updateSavedGeneratedDataset(
  request: UpdateSavedGeneratedDatasetRequest,
  deps: UpdateSavedGeneratedDatasetDeps
): Promise<SavedGeneratedDataset> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  const existing = await deps.findGeneratedDatasetById(request.projectId, request.datasetId);
  if (!existing) {
    throw new Error(`Saved dataset ${request.datasetId} was not found`);
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

  const updated = await deps.updateGeneratedDatasetRecord({
    projectId: request.projectId,
    datasetId: request.datasetId,
    status: request.dataset.status,
    generationOrder: request.dataset.generationOrder,
    collectionCounts: request.dataset.collectionCounts,
    collections: request.dataset.collections,
    validationResults: request.dataset.validationResults,
    warnings: request.dataset.warnings
  });

  if (!updated) {
    throw new Error(`Saved dataset ${request.datasetId} was not found`);
  }

  return updated;
}
