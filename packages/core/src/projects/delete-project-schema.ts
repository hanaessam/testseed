import type { DeleteMode, Project, ProjectSchemaSnapshot } from "@testseed/types";

export interface DeleteProjectSchemaRequest {
  projectId: string;
  ownerId: string;
  mode: DeleteMode;
}

export interface DeleteProjectSchemaDeps {
  now?(): Date;
  findProjectById(projectId: string): Promise<Project | null>;
  findSchemaSnapshotById(snapshotId: string): Promise<ProjectSchemaSnapshot | null>;
  archiveSchemaSnapshot(snapshotId: string, archivedAt: Date): Promise<ProjectSchemaSnapshot | null>;
  hardDeleteSchemaSnapshot(snapshotId: string): Promise<boolean>;
  clearProjectActiveSchema(projectId: string, updatedAt: Date): Promise<Project>;
  appendProjectEvent(input: {
    projectId: string;
    actorId: string;
    kind: "schema_archived" | "schema_hard_deleted";
    message: string;
    payload?: Record<string, unknown>;
    createdAt: Date;
  }): Promise<unknown>;
}

export async function deleteProjectSchema(
  request: DeleteProjectSchemaRequest,
  deps: DeleteProjectSchemaDeps
): Promise<{
  project: Project;
  snapshotId?: string;
  mode: DeleteMode;
  deleted: boolean;
}> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  if (!project.activeSchemaSnapshotId) {
    return {
      project,
      mode: request.mode,
      deleted: false
    };
  }

  const snapshot = await deps.findSchemaSnapshotById(project.activeSchemaSnapshotId);
  if (!snapshot) {
    const clearedProject = await deps.clearProjectActiveSchema(request.projectId, deps.now?.() ?? new Date());
    return {
      project: clearedProject,
      mode: request.mode,
      deleted: false
    };
  }

  const now = deps.now?.() ?? new Date();

  if (request.mode === "archive") {
    await deps.archiveSchemaSnapshot(snapshot.id, now);
    const updatedProject = await deps.clearProjectActiveSchema(request.projectId, now);
    await deps.appendProjectEvent({
      projectId: request.projectId,
      actorId: request.ownerId,
      kind: "schema_archived",
      message: "Archived active schema snapshot",
      payload: {
        snapshotId: snapshot.id
      },
      createdAt: now
    });

    return {
      project: updatedProject,
      snapshotId: snapshot.id,
      mode: "archive",
      deleted: false
    };
  }

  const deleted = await deps.hardDeleteSchemaSnapshot(snapshot.id);
  const updatedProject = await deps.clearProjectActiveSchema(request.projectId, now);
  await deps.appendProjectEvent({
    projectId: request.projectId,
    actorId: request.ownerId,
    kind: "schema_hard_deleted",
    message: "Hard deleted active schema snapshot",
    payload: {
      snapshotId: snapshot.id
    },
    createdAt: now
  });

  return {
    project: updatedProject,
    snapshotId: snapshot.id,
    mode: "hard",
    deleted
  };
}
