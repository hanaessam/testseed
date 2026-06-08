import type { Project, SavedGeneratedDatasetSummary } from "@testseed/types";

export interface ListSavedGeneratedDatasetsRequest {
  projectId: string;
  ownerId: string;
}

export interface ListSavedGeneratedDatasetsDeps {
  findProjectById(projectId: string): Promise<Project | null>;
  listGeneratedDatasetSummaries(projectId: string): Promise<SavedGeneratedDatasetSummary[]>;
}

export async function listSavedGeneratedDatasets(
  request: ListSavedGeneratedDatasetsRequest,
  deps: ListSavedGeneratedDatasetsDeps
): Promise<SavedGeneratedDatasetSummary[]> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  return deps.listGeneratedDatasetSummaries(request.projectId);
}
