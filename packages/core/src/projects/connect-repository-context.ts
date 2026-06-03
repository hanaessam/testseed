import type {
  ContextWarning,
  Project,
  ProjectContext,
  ProjectEvent,
  RepositoryContextCategory
} from "@testseed/types";
import { normalizeRepositoryFullName } from "./start-repository-context-authorization";

export interface RepositoryContextFile {
  path: string;
  content: string;
}

export interface RepositoryContextSummary {
  summary: string;
  contextCategories: RepositoryContextCategory[];
  warnings: ContextWarning[];
}

export interface ConnectRepositoryContextRequest {
  projectId: string;
  ownerId: string;
  repositoryFullName: string;
  accessToken: string;
}

export interface ConnectRepositoryContextDeps {
  now?(): Date;
  findProjectById(projectId: string): Promise<Project | null>;
  readRepositoryFiles(request: {
    repositoryFullName: string;
    accessToken: string;
  }): Promise<RepositoryContextFile[]>;
  summarizeRepositoryContext(input: {
    repositoryFullName: string;
    description?: string;
    files: RepositoryContextFile[];
  }): Promise<RepositoryContextSummary>;
  saveRepositoryContext(
    projectId: string,
    context: ProjectContext,
    updatedAt: Date
  ): Promise<Project>;
  appendProjectEvent(input: Omit<ProjectEvent, "id">): Promise<unknown>;
}

export async function connectRepositoryContext(
  request: ConnectRepositoryContextRequest,
  deps: ConnectRepositoryContextDeps
): Promise<{ context: ProjectContext; project: Project }> {
  const repositoryFullName = normalizeRepositoryFullName(request.repositoryFullName);

  const project = await deps.findProjectById(request.projectId);
  if (!project || project.ownerId !== request.ownerId) {
    throw new Error(`Project ${request.projectId} was not found`);
  }

  const now = deps.now?.() ?? new Date();
  const files = await deps.readRepositoryFiles({
    repositoryFullName,
    accessToken: request.accessToken
  });
  const relevantFiles = files.filter(isUsefulContextFile);
  const description = project.context?.description ?? project.description;

  const context =
    relevantFiles.length === 0
      ? noUsefulContext(repositoryFullName, description, now)
      : await connectedContext(repositoryFullName, description, relevantFiles, now, deps);

  const updatedProject = await deps.saveRepositoryContext(request.projectId, context, now);

  await deps.appendProjectEvent({
    projectId: request.projectId,
    actorId: request.ownerId,
    kind: "repository_context_connected",
    message: "Updated repository context",
    payload: {
      repositoryFullName,
      accessStatus: context.repository?.accessStatus,
      warningCodes: context.warnings.map((warning) => warning.code)
    },
    createdAt: now
  });

  return {
    context,
    project: updatedProject
  };
}

async function connectedContext(
  repositoryFullName: string,
  description: string | undefined,
  files: RepositoryContextFile[],
  now: Date,
  deps: Pick<ConnectRepositoryContextDeps, "summarizeRepositoryContext">
): Promise<ProjectContext> {
  const summary = await deps.summarizeRepositoryContext({
    repositoryFullName,
    description,
    files
  });

  return {
    description,
    repository: {
      provider: "github",
      repositoryFullName,
      repositoryUrl: `https://github.com/${repositoryFullName}`,
      accessStatus: "connected",
      summary: summary.summary,
      contextCategories: summary.contextCategories,
      warnings: summary.warnings,
      connectedAt: now
    },
    warnings: summary.warnings,
    updatedAt: now
  };
}

function noUsefulContext(
  repositoryFullName: string,
  description: string | undefined,
  now: Date
): ProjectContext {
  const warning: ContextWarning = {
    code: "no_useful_repository_context",
    message: "Repository did not contain useful schema, model, seed, or documentation context.",
    severity: "warning"
  };

  return {
    description,
    repository: {
      provider: "github",
      repositoryFullName,
      repositoryUrl: `https://github.com/${repositoryFullName}`,
      accessStatus: "no_useful_context",
      summary: "",
      contextCategories: [],
      warnings: [warning],
      connectedAt: now
    },
    warnings: [warning],
    updatedAt: now
  };
}

function isUsefulContextFile(file: RepositoryContextFile): boolean {
  const path = file.path.toLowerCase();
  if (
    path.includes("node_modules/") ||
    path.includes("/dist/") ||
    path.startsWith("dist/") ||
    path.includes("/build/") ||
    path.startsWith("build/") ||
    path.endsWith(".lock") ||
    path.includes(".env") ||
    path.includes("secret") ||
    path.includes("credential")
  ) {
    return false;
  }

  return (
    path.includes("model") ||
    path.includes("schema") ||
    path.includes("seed") ||
    path.endsWith("readme.md") ||
    path.endsWith("package.json") ||
    path.endsWith(".md")
  );
}
