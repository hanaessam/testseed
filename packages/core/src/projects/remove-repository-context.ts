import type { Project, ProjectContext, ProjectEvent } from "@testseed/types";

export interface RemoveRepositoryContextRequest {
  projectId: string;
  ownerId: string;
}

export interface RemoveRepositoryContextDeps {
  now?(): Date;
  findProjectById(projectId: string): Promise<Project | null>;
  removeProjectRepositoryContext(
    projectId: string,
    context: ProjectContext,
    updatedAt: Date
  ): Promise<Project>;
  appendProjectEvent(input: Omit<ProjectEvent, "id">): Promise<unknown>;
}

export async function removeRepositoryContext(
  request: RemoveRepositoryContextRequest,
  deps: RemoveRepositoryContextDeps
): Promise<{ context: ProjectContext; project: Project }> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  const now = deps.now?.() ?? new Date();
  const context: ProjectContext = {
    description: project.context?.description ?? project.description,
    warnings: project.context?.warnings ?? [],
    updatedAt: now
  };

  const updatedProject = await deps.removeProjectRepositoryContext(
    request.projectId,
    context,
    now
  );

  await deps.appendProjectEvent({
    projectId: request.projectId,
    actorId: request.ownerId,
    kind: "repository_context_removed",
    message: "Removed repository context",
    payload: {},
    createdAt: now
  });

  return {
    context,
    project: updatedProject
  };
}
