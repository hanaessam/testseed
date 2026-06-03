import type { Project } from "@testseed/types";

export interface StartRepositoryContextAuthorizationRequest {
  projectId: string;
  ownerId: string;
  repositoryFullName: string;
}

export interface RepositoryContextStatePayload {
  kind: "repository_context";
  projectId: string;
  ownerId: string;
  repositoryFullName: string;
}

export interface StartRepositoryContextAuthorizationDeps {
  githubClientId: string;
  callbackUrl: string;
  findProjectById(projectId: string): Promise<Project | null>;
  signState(payload: RepositoryContextStatePayload): string;
}

export async function startRepositoryContextAuthorization(
  request: StartRepositoryContextAuthorizationRequest,
  deps: StartRepositoryContextAuthorizationDeps
): Promise<{ authorizationUrl: string; message: string }> {
  const repositoryFullName = normalizeRepositoryFullName(request.repositoryFullName);

  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", deps.githubClientId);
  url.searchParams.set("redirect_uri", deps.callbackUrl);
  url.searchParams.set("scope", "repo");
  url.searchParams.set(
    "state",
    deps.signState({
      kind: "repository_context",
      projectId: request.projectId,
      ownerId: request.ownerId,
      repositoryFullName
    })
  );

  return {
    authorizationUrl: url.toString(),
    message: "Authorize repository access to build project context."
  };
}

export function assertRepositoryFullName(repositoryFullName: string): void {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repositoryFullName)) {
    throw new Error("Repository must use owner/repo format");
  }
}

export function normalizeRepositoryFullName(repositoryInput: string): string {
  const trimmed = repositoryInput.trim();
  const githubUrlMatch = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s?#]+)(?:[/?#].*)?$/i.exec(
    trimmed
  );
  const candidate = githubUrlMatch
    ? `${githubUrlMatch[1]}/${githubUrlMatch[2]}`
    : trimmed;
  const repositoryFullName = candidate.endsWith(".git")
    ? candidate.slice(0, -4)
    : candidate;

  assertRepositoryFullName(repositoryFullName);
  return repositoryFullName;
}
