import type { Project, SavedGeneratedDataset } from "@testseed/types";

export interface GetSavedGeneratedDatasetRequest {
  projectId: string;
  datasetId: string;
  ownerId: string;
}

export interface GetSavedGeneratedDatasetDeps {
  findProjectById(projectId: string): Promise<Project | null>;
  findGeneratedDatasetById(
    projectId: string,
    datasetId: string
  ): Promise<SavedGeneratedDataset | null>;
}

export async function getSavedGeneratedDataset(
  request: GetSavedGeneratedDatasetRequest,
  deps: GetSavedGeneratedDatasetDeps
): Promise<SavedGeneratedDataset> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  const dataset = await deps.findGeneratedDatasetById(request.projectId, request.datasetId);
  if (!dataset) {
    throw new Error(`Saved dataset ${request.datasetId} was not found`);
  }

  return dataset;
}
