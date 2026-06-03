import type { DeleteMode, Project } from "@testseed/types";

export interface DeleteProjectRequest {
  projectId: string;
  ownerId: string;
  mode: DeleteMode;
}

export interface DeleteProjectDeps {
  now?(): Date;
  findProjectById(projectId: string): Promise<Project | null>;
  archiveProjectRecord(projectId: string, archivedAt: Date): Promise<Project>;
  hardDeleteProjectRecord(projectId: string): Promise<boolean>;
  hardDeleteProjectSnapshots(projectId: string): Promise<number>;
  hardDeleteProjectHistory(projectId: string): Promise<number>;
  appendProjectEvent(input: {
    projectId: string;
    actorId: string;
    kind: "project_archived" | "project_hard_deleted";
    message: string;
    payload?: Record<string, unknown>;
    createdAt: Date;
  }): Promise<unknown>;
}

export async function deleteProject(
  request: DeleteProjectRequest,
  deps: DeleteProjectDeps
): Promise<{ projectId: string; mode: DeleteMode; project?: Project; deleted: boolean }> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  const now = deps.now?.() ?? new Date();

  if (request.mode === "archive") {
    const archivedProject = await deps.archiveProjectRecord(request.projectId, now);
    await deps.appendProjectEvent({
      projectId: request.projectId,
      actorId: request.ownerId,
      kind: "project_archived",
      message: "Archived project",
      createdAt: now
    });

    return {
      projectId: request.projectId,
      mode: "archive",
      project: archivedProject,
      deleted: false
    };
  }

  await deps.appendProjectEvent({
    projectId: request.projectId,
    actorId: request.ownerId,
    kind: "project_hard_deleted",
    message: "Hard deleted project",
    payload: {
      projectName: project.name
    },
    createdAt: now
  });

  await deps.hardDeleteProjectHistory(request.projectId);
  await deps.hardDeleteProjectSnapshots(request.projectId);
  const deleted = await deps.hardDeleteProjectRecord(request.projectId);

  return {
    projectId: request.projectId,
    mode: "hard",
    deleted
  };
}
