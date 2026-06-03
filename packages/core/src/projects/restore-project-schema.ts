import type { Project, ProjectSchemaSnapshot } from "@testseed/types";

export interface RestoreProjectSchemaRequest {
  projectId: string;
  ownerId: string;
}

export interface RestoreProjectSchemaDeps {
  now?(): Date;
  findProjectById(projectId: string): Promise<Project | null>;
  findLatestArchivedSchemaSnapshotByProjectId(
    projectId: string
  ): Promise<ProjectSchemaSnapshot | null>;
  restoreSchemaSnapshot(
    snapshotId: string,
    updatedAt: Date
  ): Promise<ProjectSchemaSnapshot | null>;
  updateProjectActiveSchema(
    projectId: string,
    input: {
      version: number;
      activeSchemaSnapshotId: string;
      updatedAt: Date;
    }
  ): Promise<Project>;
  appendProjectEvent(input: {
    projectId: string;
    actorId: string;
    kind: "schema_restored";
    message: string;
    payload?: Record<string, unknown>;
    createdAt: Date;
  }): Promise<unknown>;
}

export async function restoreProjectSchema(
  request: RestoreProjectSchemaRequest,
  deps: RestoreProjectSchemaDeps
): Promise<{ project: Project; snapshot?: ProjectSchemaSnapshot }> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  const snapshot = await deps.findLatestArchivedSchemaSnapshotByProjectId(request.projectId);
  if (!snapshot) {
    return { project };
  }

  const now = deps.now?.() ?? new Date();
  const restoredSnapshot = await deps.restoreSchemaSnapshot(snapshot.id, now);
  const updatedProject = await deps.updateProjectActiveSchema(request.projectId, {
    version: snapshot.version,
    activeSchemaSnapshotId: snapshot.id,
    updatedAt: now
  });

  await deps.appendProjectEvent({
    projectId: request.projectId,
    actorId: request.ownerId,
    kind: "schema_restored",
    message: "Restored archived schema snapshot",
    payload: {
      snapshotId: snapshot.id,
      version: snapshot.version
    },
    createdAt: now
  });

  return {
    project: updatedProject,
    snapshot: restoredSnapshot ?? snapshot
  };
}
