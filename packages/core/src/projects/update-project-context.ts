import type { Project, ProjectContext, ProjectEvent } from "@testseed/types";

const maxDescriptionLength = 2000;

export interface UpdateProjectContextRequest {
  projectId: string;
  ownerId: string;
  description?: string;
  clearRepositoryContext?: boolean;
}

export interface UpdateProjectContextRecordInput {
  description?: string;
  context: ProjectContext;
  updatedAt: Date;
}

export interface UpdateProjectContextDeps {
  now?(): Date;
  findProjectById(projectId: string): Promise<Project | null>;
  updateProjectContextRecord(
    projectId: string,
    input: UpdateProjectContextRecordInput
  ): Promise<Project>;
  appendProjectEvent(input: Omit<ProjectEvent, "id">): Promise<unknown>;
}

export async function updateProjectContext(
  request: UpdateProjectContextRequest,
  deps: UpdateProjectContextDeps
): Promise<{ project: Project }> {
  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  const description = normalizeDescription(request.description);
  if (description && description.length > maxDescriptionLength) {
    throw new Error("Project description must be 2000 characters or fewer");
  }

  const now = deps.now?.() ?? new Date();
  const warnings = description
    ? []
    : [
        {
          code: "empty_description",
          message: "Project description is empty, so generated data may be generic.",
          severity: "warning" as const
        }
      ];
  const context: ProjectContext = {
    description,
    repository: request.clearRepositoryContext ? undefined : project.context?.repository,
    warnings,
    updatedAt: now
  };

  const updatedProject = await deps.updateProjectContextRecord(request.projectId, {
    description,
    context,
    updatedAt: now
  });

  await deps.appendProjectEvent({
    projectId: request.projectId,
    actorId: request.ownerId,
    kind: "project_context_updated",
    message: "Updated project context",
    payload: {
      hasDescription: Boolean(description),
      clearedRepositoryContext: Boolean(request.clearRepositoryContext),
      warningCodes: warnings.map((warning) => warning.code)
    },
    createdAt: now
  });

  return { project: updatedProject };
}

function normalizeDescription(description: string | undefined): string | undefined {
  const trimmed = description?.trim();
  return trimmed ? trimmed : undefined;
}
