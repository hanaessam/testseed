import type { ParsedSchema, Project, ProjectSchemaSnapshot } from "@testseed/types";

export interface SaveParsedSchemaRequest {
  projectId: string;
  ownerId: string;
  schema: ParsedSchema;
  source: ProjectSchemaSnapshot["source"];
}

export interface SaveSchemaSnapshotInput {
  projectId: string;
  version: number;
  schema: ParsedSchema;
  source: ProjectSchemaSnapshot["source"];
  createdAt: Date;
}

export interface UpdateProjectActiveSchemaInput {
  version: number;
  activeSchemaSnapshotId: string;
  updatedAt: Date;
}

export interface AppendParsedSchemaEventInput {
  projectId: string;
  actorId: string;
  kind: "schema_parsed";
  message: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

export interface SaveParsedSchemaDeps {
  now?(): Date;
  findProjectById(projectId: string): Promise<Project | null>;
  saveSchemaSnapshot(input: SaveSchemaSnapshotInput): Promise<ProjectSchemaSnapshot>;
  updateProjectActiveSchema(projectId: string, input: UpdateProjectActiveSchemaInput): Promise<Project>;
  appendProjectEvent(input: AppendParsedSchemaEventInput): Promise<unknown>;
}

export async function saveParsedSchemaToProject(
  request: SaveParsedSchemaRequest,
  deps: SaveParsedSchemaDeps
): Promise<{ project: Project; snapshot: ProjectSchemaSnapshot }> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  const now = deps.now?.() ?? new Date();
  const version = project.activeSchemaVersion + 1;
  const snapshot = await deps.saveSchemaSnapshot({
    projectId: request.projectId,
    version,
    schema: request.schema,
    source: request.source,
    createdAt: now
  });

  const updatedProject = await deps.updateProjectActiveSchema(request.projectId, {
    version,
    activeSchemaSnapshotId: snapshot.id,
    updatedAt: now
  });

  await deps.appendProjectEvent({
    projectId: request.projectId,
    actorId: request.ownerId,
    kind: "schema_parsed",
    message: "Saved parsed schema snapshot",
    payload: {
      snapshotId: snapshot.id,
      version,
      source: request.source
    },
    createdAt: now
  });

  return { project: updatedProject, snapshot };
}
