import type { Project } from "@testseed/types";

export interface RestoreProjectRequest {
  projectId: string;
  ownerId: string;
}

export interface RestoreProjectDeps {
  now?(): Date;
  findProjectById(projectId: string): Promise<Project | null>;
  restoreProjectRecord(projectId: string, updatedAt: Date): Promise<Project>;
  appendProjectEvent(input: {
    projectId: string;
    actorId: string;
    kind: "project_restored";
    message: string;
    payload?: Record<string, unknown>;
    createdAt: Date;
  }): Promise<unknown>;
}

export async function restoreProject(
  request: RestoreProjectRequest,
  deps: RestoreProjectDeps
): Promise<{ project: Project }> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  const now = deps.now?.() ?? new Date();
  const restoredProject = await deps.restoreProjectRecord(request.projectId, now);

  await deps.appendProjectEvent({
    projectId: request.projectId,
    actorId: request.ownerId,
    kind: "project_restored",
    message: "Restored project",
    createdAt: now
  });

  return { project: restoredProject };
}
