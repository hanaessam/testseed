import type { Project } from "@testseed/types";

export interface ListUserProjectsRequest {
  ownerId: string;
  includeArchived?: boolean;
}

export interface ListUserProjectsDeps {
  listProjectsByOwnerId(ownerId: string, includeArchived?: boolean): Promise<Project[]>;
}

export async function listUserProjects(
  request: ListUserProjectsRequest,
  deps: ListUserProjectsDeps
): Promise<{ projects: Project[] }> {
  const projects = await deps.listProjectsByOwnerId(request.ownerId, request.includeArchived);

  return {
    projects: [...projects].sort(
      (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()
    )
  };
}
