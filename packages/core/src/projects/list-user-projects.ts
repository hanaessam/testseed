import type { Project } from "@testseed/types";

export interface ListUserProjectsRequest {
  ownerId: string;
}

export interface ListUserProjectsDeps {
  listProjectsByOwnerId(ownerId: string): Promise<Project[]>;
}

export async function listUserProjects(
  request: ListUserProjectsRequest,
  deps: ListUserProjectsDeps
): Promise<{ projects: Project[] }> {
  const projects = await deps.listProjectsByOwnerId(request.ownerId);

  return {
    projects: [...projects].sort(
      (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()
    )
  };
}
