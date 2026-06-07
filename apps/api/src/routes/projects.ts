import {
  connectRepositoryContext,
  createProject,
  deleteProject,
  deleteProjectSchema,
  getProjectDetail,
  listUserProjects,
  removeRepositoryContext,
  restoreProject,
  restoreProjectSchema,
  saveParsedSchemaToProject,
  startRepositoryContextAuthorization,
  updateProject,
  updateProjectContext
} from "@testseed/core";
import type { RepositoryContextCategory, SchemaField } from "@testseed/types";
import type {
  createProjectHistoryRepository,
  createProjectRepository
} from "@testseed/db";
import { Router, type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import OpenAI from "openai";
import { z } from "zod";
import { validateBody } from "../middleware/validate";
import { type AuthenticatedRequest } from "../middleware/auth";

type ProjectRepository = ReturnType<typeof createProjectRepository>;
type ProjectHistoryRepository = ReturnType<typeof createProjectHistoryRepository>;

export interface ProjectsRouterDeps {
  projectRepository: ProjectRepository;
  projectHistoryRepository: ProjectHistoryRepository;
  githubClientId?: string;
  githubClientSecret?: string;
  githubCallbackUrl?: string;
  webAppUrl?: string;
  jwtSecret?: string;
  openaiApiKey?: string;
}

export interface CompleteRepositoryContextCallbackRequest {
  code: string;
  state: string;
}

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional()
});

const updateProjectContextSchema = z.object({
  description: z.string().max(2000).optional(),
  clearRepositoryContext: z.boolean().optional()
});

const repositoryContextAuthorizationSchema = z.object({
  repositoryFullName: z.string().min(1).max(300)
});

const deleteModeSchema = z.object({
  mode: z.enum(["archive", "hard"])
});

const schemaFieldSchema: z.ZodType<SchemaField> = z.lazy(() =>
  z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    required: z.boolean(),
    unique: z.boolean(),
    enum: z.array(z.string()).optional(),
    enumSource: z.enum(["declared", "inferred"]).optional(),
    ref: z.string().optional(),
    refConfidence: z.enum(["explicit", "inferred", "possible"]).optional(),
    defaultValue: z.string().optional(),
    confidence: z.enum(["high", "medium", "low"]).optional(),
    warnings: z.array(z.string()).optional(),
    children: z.array(schemaFieldSchema).optional(),
    itemType: z.string().optional()
  })
);

const parsedSchemaSchema = z.object({
  collections: z.array(
    z.object({
      name: z.string().min(1),
      fields: z.array(schemaFieldSchema),
      sampleCount: z.number().int().min(0).optional(),
      warnings: z.array(z.string()).optional()
    })
  )
});

const updateProjectSchemaSchema = z.object({
  schema: parsedSchemaSchema,
  source: z.enum(["manual", "mongodb", "ai"]).optional()
});

export function createProjectsRouter(deps: ProjectsRouterDeps): Router {
  const router = Router();

  router.get(
    "/",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await listUserProjects(
          {
            ownerId: authenticatedRequest.auth.userId,
            includeArchived: request.query.includeArchived === "true"
          },
          { listProjectsByOwnerId: deps.projectRepository.listProjectsByOwnerId }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    "/:projectId",
    validateBody(updateProjectSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await updateProject(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId,
            name: request.body.name,
            description: request.body.description
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            updateProjectRecord: deps.projectRepository.updateProjectRecord,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.put(
    "/:projectId/context",
    validateBody(updateProjectContextSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await updateProjectContext(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId,
            description: request.body.description,
            clearRepositoryContext: request.body.clearRepositoryContext
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            updateProjectContextRecord: deps.projectRepository.updateProjectContextRecord,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/:projectId/context/github/authorize",
    validateBody(repositoryContextAuthorizationSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        if (!deps.githubClientId || !deps.webAppUrl || !deps.jwtSecret) {
          response.status(503).json({ message: "GitHub repository context is not configured" });
          return;
        }

        const callbackUrl =
          deps.githubCallbackUrl ?? `${getApiBaseUrl(request)}/auth/github/callback`;
        const result = await startRepositoryContextAuthorization(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId,
            repositoryFullName: request.body.repositoryFullName
          },
          {
            githubClientId: deps.githubClientId,
            callbackUrl,
            findProjectById: deps.projectRepository.findProjectById,
            signState: (payload) =>
              jwt.sign(payload, deps.jwtSecret as string, {
                expiresIn: "10m"
              })
          }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    "/:projectId/context/github/callback",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const query = z.object({ code: z.string().min(1), state: z.string().min(1) }).parse(request.query);

        if (!deps.githubClientId || !deps.githubClientSecret || !deps.webAppUrl || !deps.jwtSecret) {
          response.status(503).json({ message: "GitHub repository context is not configured" });
          return;
        }

        const state = jwt.verify(query.state, deps.jwtSecret) as {
          projectId: string;
          ownerId: string;
          repositoryFullName: string;
        };

        if (state.projectId !== params.projectId) {
          response.status(400).json({ message: "Invalid repository context state" });
          return;
        }

        const callbackUrl = `${getApiBaseUrl(request)}/projects/${encodeURIComponent(
          params.projectId
        )}/context/github/callback`;
        const accessToken = await exchangeGitHubCodeForToken(query.code, {
          clientId: deps.githubClientId,
          clientSecret: deps.githubClientSecret,
          callbackUrl
        });

        await connectRepositoryContext(
          {
            projectId: state.projectId,
            ownerId: state.ownerId,
            repositoryFullName: state.repositoryFullName,
            accessToken
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            readRepositoryFiles,
            summarizeRepositoryContext: createRepositoryContextSummarizer(deps.openaiApiKey),
            saveRepositoryContext: async (projectId, context, updatedAt) =>
              deps.projectRepository.updateProjectContextRecord(projectId, {
                description: context.description,
                context,
                updatedAt
              }),
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.redirect(`${deps.webAppUrl}/projects/${encodeURIComponent(params.projectId)}?context=github`);
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete(
    "/:projectId/context/github",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await removeRepositoryContext(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            removeProjectRepositoryContext: deps.projectRepository.removeProjectRepositoryContext,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json({ context: result.context });
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    "/:projectId/restore",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await restoreProject(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            restoreProjectRecord: deps.projectRepository.restoreProjectRecord,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/",
    validateBody(createProjectSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await createProject(
          {
            ownerId: authenticatedRequest.auth.userId,
            name: request.body.name,
            description: request.body.description
          },
          {
            createProjectRecord: deps.projectRepository.createProject,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(201).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    "/:projectId",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await getProjectDetail(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            findSchemaSnapshotById: deps.projectRepository.findSchemaSnapshotById
          }
        );

        if (!result.project) {
          response.status(404).json({ message: "Project not found" });
          return;
        }

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.put(
    "/:projectId/schema",
    validateBody(updateProjectSchemaSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await saveParsedSchemaToProject(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId,
            schema: request.body.schema,
            source: request.body.source ?? "manual"
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            saveSchemaSnapshot: deps.projectRepository.saveSchemaSnapshot,
            updateProjectActiveSchema: deps.projectRepository.updateProjectActiveSchema,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete(
    "/:projectId/schema",
    validateBody(deleteModeSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await deleteProjectSchema(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId,
            mode: request.body.mode
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            findSchemaSnapshotById: deps.projectRepository.findSchemaSnapshotById,
            archiveSchemaSnapshot: deps.projectRepository.archiveSchemaSnapshot,
            hardDeleteSchemaSnapshot: deps.projectRepository.hardDeleteSchemaSnapshot,
            clearProjectActiveSchema: deps.projectRepository.clearProjectActiveSchema,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    "/:projectId/schema/restore",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await restoreProjectSchema(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            findLatestArchivedSchemaSnapshotByProjectId:
              deps.projectRepository.findLatestArchivedSchemaSnapshotByProjectId,
            restoreSchemaSnapshot: deps.projectRepository.restoreSchemaSnapshot,
            updateProjectActiveSchema: deps.projectRepository.updateProjectActiveSchema,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete(
    "/:projectId",
    validateBody(deleteModeSchema),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const params = z.object({ projectId: z.string().min(1) }).parse(request.params);
        const authenticatedRequest = request as AuthenticatedRequest;
        if (!authenticatedRequest.auth) {
          response.status(401).json({ message: "Authentication required" });
          return;
        }

        const result = await deleteProject(
          {
            projectId: params.projectId,
            ownerId: authenticatedRequest.auth.userId,
            mode: request.body.mode
          },
          {
            findProjectById: deps.projectRepository.findProjectById,
            archiveProjectRecord: deps.projectRepository.archiveProjectRecord,
            hardDeleteProjectRecord: deps.projectRepository.hardDeleteProjectRecord,
            hardDeleteProjectSnapshots: deps.projectRepository.hardDeleteProjectSnapshots,
            hardDeleteProjectHistory: deps.projectHistoryRepository.hardDeleteProjectHistory,
            appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
          }
        );

        response.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

export async function completeRepositoryContextCallback(
  request: CompleteRepositoryContextCallbackRequest,
  deps: ProjectsRouterDeps
): Promise<string> {
  if (!deps.githubClientId || !deps.githubClientSecret || !deps.webAppUrl || !deps.jwtSecret) {
    throw new Error("GitHub repository context is not configured");
  }

  const state = jwt.verify(request.state, deps.jwtSecret) as {
    kind?: string;
    projectId: string;
    ownerId: string;
    repositoryFullName: string;
  };

  if (state.kind !== "repository_context") {
    throw new Error("Invalid repository context state");
  }

  const callbackUrl = deps.githubCallbackUrl ?? "http://localhost:3001/auth/github/callback";
  const accessToken = await exchangeGitHubCodeForToken(request.code, {
    clientId: deps.githubClientId,
    clientSecret: deps.githubClientSecret,
    callbackUrl
  });

  await connectRepositoryContext(
    {
      projectId: state.projectId,
      ownerId: state.ownerId,
      repositoryFullName: state.repositoryFullName,
      accessToken
    },
    {
      findProjectById: deps.projectRepository.findProjectById,
      readRepositoryFiles,
      summarizeRepositoryContext: createRepositoryContextSummarizer(deps.openaiApiKey),
      saveRepositoryContext: async (projectId, context, updatedAt) =>
        deps.projectRepository.updateProjectContextRecord(projectId, {
          description: context.description,
          context,
          updatedAt
        }),
      appendProjectEvent: deps.projectHistoryRepository.appendProjectEvent
    }
  );

  return `${deps.webAppUrl}/projects/${encodeURIComponent(state.projectId)}?context=github`;
}

interface GitHubAccessTokenResponse {
  access_token?: string;
}

interface GitHubContentItem {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url?: string | null;
}

async function exchangeGitHubCodeForToken(
  code: string,
  config: { clientId: string; clientSecret: string; callbackUrl: string }
): Promise<string> {
  const githubResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl
    })
  });

  if (!githubResponse.ok) {
    throw new Error("Could not authorize GitHub repository context");
  }

  const tokenResponse = (await githubResponse.json()) as GitHubAccessTokenResponse;
  if (!tokenResponse.access_token) {
    throw new Error("Could not authorize GitHub repository context");
  }

  return tokenResponse.access_token;
}

async function readRepositoryFiles(request: {
  repositoryFullName: string;
  accessToken: string;
}): Promise<Array<{ path: string; content: string }>> {
  const contents = await collectGitHubContents(request.repositoryFullName, request.accessToken);
  const files = contents.filter((item) => item.type === "file").slice(0, 30);
  const result: Array<{ path: string; content: string }> = [];

  for (const file of files) {
    if (!file.download_url) {
      continue;
    }

    const response = await fetch(file.download_url, {
      headers: {
        Authorization: `Bearer ${request.accessToken}`
      }
    });
    if (!response.ok) {
      continue;
    }

    const content = await response.text();
    result.push({
      path: file.path,
      content: content.slice(0, 8000)
    });
  }

  return result;
}

async function collectGitHubContents(
  repositoryFullName: string,
  accessToken: string
): Promise<GitHubContentItem[]> {
  const result: GitHubContentItem[] = [];
  const queue = [""];
  const visited = new Set<string>();

  while (queue.length > 0 && result.length < 80) {
    const path = queue.shift() ?? "";
    if (visited.has(path)) {
      continue;
    }
    visited.add(path);

    const contents = await fetchGitHubContents(repositoryFullName, path, accessToken);
    for (const item of contents) {
      result.push(item);
      if (item.type === "dir" && shouldReadRepositoryDirectory(item.path)) {
        queue.push(item.path);
      }
      if (result.length >= 80) {
        break;
      }
    }
  }

  return result;
}

function shouldReadRepositoryDirectory(path: string): boolean {
  const normalized = path.toLowerCase();
  if (
    normalized.includes("node_modules") ||
    normalized.includes("dist") ||
    normalized.includes("build") ||
    normalized.includes("coverage") ||
    normalized.includes(".git")
  ) {
    return false;
  }

  return (
    normalized.includes("src") ||
    normalized.includes("app") ||
    normalized.includes("model") ||
    normalized.includes("schema") ||
    normalized.includes("route") ||
    normalized.includes("controller") ||
    normalized.includes("seed") ||
    normalized.includes("doc")
  );
}

async function fetchGitHubContents(
  repositoryFullName: string,
  path: string,
  accessToken: string
): Promise<GitHubContentItem[]> {
  const response = await fetch(
    `https://api.github.com/repos/${repositoryFullName}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  if (!response.ok) {
    throw new Error("Could not read GitHub repository context");
  }

  const body = (await response.json()) as GitHubContentItem[] | GitHubContentItem;
  return Array.isArray(body) ? body : [body];
}

function createRepositoryContextSummarizer(openaiApiKey?: string) {
  return async (input: {
    repositoryFullName: string;
    description?: string;
    files: Array<{ path: string; content: string }>;
  }): Promise<{
    summary: string;
    contextCategories: RepositoryContextCategory[];
    warnings: Array<{ code: string; message: string; severity: "info" | "warning" | "error" }>;
  }> => {
    if (!openaiApiKey) {
      const fallback = await summarizeRepositoryFiles(input);
      return {
        ...fallback,
        warnings: [
          ...fallback.warnings,
          {
            code: "ai_repository_summary_unavailable",
            message: "OpenAI is not configured, so repository context used a local summary.",
            severity: "info"
          }
        ]
      };
    }

    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Summarize a GitHub repository for MongoDB seed-data generation. Return strict JSON with keys summary, contextCategories, warnings. The summary must describe domain, entities, workflows, relationships, and seed-data hints. Do not include secrets, credentials, raw file contents, or access tokens."
          },
          {
            role: "user",
            content: JSON.stringify({
              repositoryFullName: input.repositoryFullName,
              existingDescription: input.description ?? "",
              files: input.files.slice(0, 12).map((file) => ({
                path: file.path,
                excerpt: redactSensitiveContent(file.content).slice(0, 3000)
              }))
            })
          }
        ]
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned an empty repository summary.");
      }

      return normalizeRepositorySummary(JSON.parse(content) as unknown);
    } catch {
      const fallback = await summarizeRepositoryFiles(input);
      return {
        ...fallback,
        warnings: [
          ...fallback.warnings,
          {
            code: "ai_repository_summary_failed",
            message: "AI repository summary failed, so TestSeed used a local summary.",
            severity: "warning"
          }
        ]
      };
    }
  };
}

async function summarizeRepositoryFiles(input: {
  repositoryFullName: string;
  description?: string;
  files: Array<{ path: string; content: string }>;
}): Promise<{
  summary: string;
  contextCategories: RepositoryContextCategory[];
  warnings: Array<{ code: string; message: string; severity: "info" | "warning" | "error" }>;
}> {
  const categories = new Set<RepositoryContextCategory>();
  const terms = new Set<string>();

  for (const file of input.files) {
    const path = file.path.toLowerCase();
    if (path.includes("schema")) categories.add("schemas");
    if (path.includes("model")) categories.add("models");
    if (path.includes("seed")) categories.add("seed_scripts");
    if (path.endsWith(".md") || path.endsWith("readme.md")) categories.add("documentation");

    for (const term of file.content.match(/[A-Za-z][A-Za-z0-9]{3,}/g)?.slice(0, 30) ?? []) {
      terms.add(term.toLowerCase());
    }
  }

  categories.add("domain_terms");

  return {
    summary: `Repository ${input.repositoryFullName} suggests context from ${Array.from(
      categories
    ).join(", ")}. Notable terms: ${Array.from(terms).slice(0, 12).join(", ")}.`,
    contextCategories: Array.from(categories),
    warnings: []
  };
}

function normalizeRepositorySummary(value: unknown): {
  summary: string;
  contextCategories: RepositoryContextCategory[];
  warnings: Array<{ code: string; message: string; severity: "info" | "warning" | "error" }>;
} {
  const candidate = value as {
    summary?: unknown;
    contextCategories?: unknown;
    warnings?: unknown;
  };
  const allowedCategories = new Set<RepositoryContextCategory>([
    "schemas",
    "models",
    "seed_scripts",
    "documentation",
    "domain_terms"
  ]);
  const contextCategories = Array.isArray(candidate.contextCategories)
    ? candidate.contextCategories.filter((category): category is RepositoryContextCategory =>
        typeof category === "string" && allowedCategories.has(category as RepositoryContextCategory)
      )
    : [];

  const warnings = Array.isArray(candidate.warnings)
    ? candidate.warnings
        .map((warning) => {
          const item = warning as { code?: unknown; message?: unknown; severity?: unknown };
          const severity: "info" | "warning" | "error" =
            item.severity === "error" || item.severity === "warning" || item.severity === "info"
              ? item.severity
              : "info";

          return {
            code: typeof item.code === "string" && item.code ? item.code : "repository_context_note",
            message:
              typeof item.message === "string" && item.message
                ? item.message
                : "Repository context summary included a note.",
            severity
          };
        })
        .slice(0, 5)
    : [];

  return {
    summary:
      typeof candidate.summary === "string" && candidate.summary.trim()
        ? candidate.summary.trim().slice(0, 2000)
        : "Repository context was summarized, but no detailed summary was returned.",
    contextCategories:
      contextCategories.length > 0 ? contextCategories : ["documentation", "domain_terms"],
    warnings
  };
}

function redactSensitiveContent(content: string): string {
  return content
    .replace(/(mongodb(?:\+srv)?:\/\/)[^\s"'`]+/gi, "$1[REDACTED]")
    .replace(/(api[_-]?key|token|secret|password|private[_-]?key)\s*[:=]\s*[^\s"'`]+/gi, "$1=[REDACTED]");
}

function getApiBaseUrl(request: Request): string {
  return `${request.protocol}://${request.get("host")}`;
}
