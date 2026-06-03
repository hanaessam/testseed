import type { Project } from "@testseed/types";

export interface UpdateProjectRequest {
  projectId: string;
  ownerId: string;
  name?: string;
  description?: string;
}

export interface UpdateProjectRecordInput {
  name?: string;
  description?: string;
  updatedAt: Date;
}

export interface UpdateProjectDeps {
  now?(): Date;
  findProjectById(projectId: string): Promise<Project | null>;
  updateProjectRecord(projectId: string, input: UpdateProjectRecordInput): Promise<Project>;
  appendProjectEvent(input: {
    projectId: string;
    actorId: string;
    kind: "project_updated";
    message: string;
    payload?: Record<string, unknown>;
    createdAt: Date;
  }): Promise<unknown>;
}

export async function updateProject(
  request: UpdateProjectRequest,
  deps: UpdateProjectDeps
): Promise<{ project: Project }> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  const now = deps.now?.() ?? new Date();
  const updatedProject = await deps.updateProjectRecord(request.projectId, {
    name: request.name,
    description: request.description,
    updatedAt: now
  });

  await deps.appendProjectEvent({
    projectId: request.projectId,
    actorId: request.ownerId,
    kind: "project_updated",
    message: "Updated project",
    payload: {
      name: request.name,
      description: request.description
    },
    createdAt: now
  });

  return { project: updatedProject };
}
