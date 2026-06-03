import type { Project, ProjectEvent, SeedBatch } from "@testseed/types";

export interface ListProjectHistoryRequest {
  projectId: string;
}

export interface ListProjectHistoryDeps {
  findProjectById(projectId: string): Promise<Project | null>;
  listProjectEvents(projectId: string): Promise<ProjectEvent[]>;
  listSeedBatches(projectId: string): Promise<SeedBatch[]>;
}

export async function listProjectHistory(
  request: ListProjectHistoryRequest,
  deps: ListProjectHistoryDeps
): Promise<{ project: Project | null; events: ProjectEvent[]; seedBatches: SeedBatch[] }> {
  const [project, events, seedBatches] = await Promise.all([
    deps.findProjectById(request.projectId),
    deps.listProjectEvents(request.projectId),
    deps.listSeedBatches(request.projectId)
  ]);

  return {
    project,
    events: [...events].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime()),
    seedBatches: [...seedBatches].sort(
      (left, right) => left.createdAt.getTime() - right.createdAt.getTime()
    )
  };
}
