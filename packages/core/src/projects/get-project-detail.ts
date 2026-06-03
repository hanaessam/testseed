import type { Project, ProjectSchemaSnapshot } from "@testseed/types";

export interface GetProjectDetailRequest {
  projectId: string;
  ownerId: string;
}

export interface GetProjectDetailDeps {
  findProjectById(projectId: string): Promise<Project | null>;
  findSchemaSnapshotById(snapshotId: string): Promise<ProjectSchemaSnapshot | null>;
}

export async function getProjectDetail(
  request: GetProjectDetailRequest,
  deps: GetProjectDetailDeps
): Promise<{ project: Project | null; activeSchemaSnapshot?: ProjectSchemaSnapshot }> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    return { project: null };
  }

  if (!project.activeSchemaSnapshotId) {
    return { project };
  }

  const activeSchemaSnapshot = await deps.findSchemaSnapshotById(project.activeSchemaSnapshotId);

  return {
    project,
    activeSchemaSnapshot: activeSchemaSnapshot ?? undefined
  };
}
