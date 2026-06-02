import type { Project } from "@testseed/types";

export interface CreateProjectRequest {
  ownerId: string;
  name: string;
  description?: string;
}

export interface CreateProjectRecordInput {
  ownerId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppendProjectEventInput {
  projectId: string;
  actorId: string;
  kind: "project_created";
  message: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateProjectDeps {
  now?(): Date;
  createProjectRecord(input: CreateProjectRecordInput): Promise<Project>;
  appendProjectEvent(input: AppendProjectEventInput): Promise<unknown>;
}

export async function createProject(
  request: CreateProjectRequest,
  deps: CreateProjectDeps
): Promise<{ project: Project }> {
  const now = deps.now?.() ?? new Date();
  const project = await deps.createProjectRecord({
    ownerId: request.ownerId,
    name: request.name,
    description: request.description,
    createdAt: now,
    updatedAt: now
  });

  await deps.appendProjectEvent({
    projectId: project.id,
    actorId: request.ownerId,
    kind: "project_created",
    message: "Created project",
    payload: {
      projectName: request.name
    },
    createdAt: now
  });

  return { project };
}
