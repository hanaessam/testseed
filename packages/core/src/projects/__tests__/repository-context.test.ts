import type {
  ContextWarning,
  Project,
  ProjectContext,
  ProjectEvent,
  RepositoryContextCategory
} from "@testseed/types";
import {
  connectRepositoryContext,
  startRepositoryContextAuthorization
} from "../index";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    ownerId: "user-1",
    name: "Commerce API",
    description: "E-commerce marketplace",
    context: {
      description: "E-commerce marketplace",
      warnings: [],
      updatedAt: new Date("2026-06-02T00:00:00.000Z")
    },
    createdAt: new Date("2026-06-02T00:00:00.000Z"),
    updatedAt: new Date("2026-06-02T00:00:00.000Z"),
    activeSchemaVersion: 0,
    ...overrides
  };
}

describe("repository context use cases", () => {
  it("creates a GitHub authorization URL scoped to the selected repository", async () => {
    const result = await startRepositoryContextAuthorization(
      {
        projectId: "project-1",
        ownerId: "user-1",
        repositoryFullName: "hana/shop-api"
      },
      {
        findProjectById: async () => makeProject(),
        signState: (payload: {
          kind: "repository_context";
          projectId: string;
          ownerId: string;
          repositoryFullName: string;
        }) => `signed:${payload.kind}:${payload.projectId}:${payload.repositoryFullName}`,
        githubClientId: "client-id",
        callbackUrl: "http://localhost:3001/projects/project-1/context/github/callback"
      }
    );

    const url = new URL(result.authorizationUrl);
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("scope")).toBe("repo");
    expect(url.searchParams.get("state")).toBe(
      "signed:repository_context:project-1:hana/shop-api"
    );
  });

  it("normalizes pasted GitHub repository URLs before authorization", async () => {
    const result = await startRepositoryContextAuthorization(
      {
        projectId: "project-1",
        ownerId: "user-1",
        repositoryFullName: "https://github.com/hanaessam/e-commerce-nodejs-web-service.git"
      },
      {
        findProjectById: async () => makeProject(),
        signState: (payload: {
          kind: "repository_context";
          projectId: string;
          ownerId: string;
          repositoryFullName: string;
        }) => `signed:${payload.kind}:${payload.repositoryFullName}`,
        githubClientId: "client-id",
        callbackUrl: "http://localhost:3001/projects/project-1/context/github/callback"
      }
    );

    const url = new URL(result.authorizationUrl);
    expect(url.searchParams.get("state")).toBe(
      "signed:repository_context:hanaessam/e-commerce-nodejs-web-service"
    );
  });

  it("normalizes pasted GitHub repository URLs before saving context", async () => {
    const result = await connectRepositoryContext(
      {
        projectId: "project-1",
        ownerId: "user-1",
        repositoryFullName: "https://github.com/hanaessam/e-commerce-nodejs-web-service.git",
        accessToken: "transient-token"
      },
      {
        now: () => new Date("2026-06-03T00:00:00.000Z"),
        findProjectById: async () => makeProject(),
        readRepositoryFiles: async (input: { repositoryFullName: string }) => {
          expect(input.repositoryFullName).toBe("hanaessam/e-commerce-nodejs-web-service");
          return [{ path: "README.md", content: "E-commerce service" }];
        },
        summarizeRepositoryContext: async () => ({
          summary: "Repository describes an e-commerce service.",
          contextCategories: ["documentation"] as RepositoryContextCategory[],
          warnings: []
        }),
        saveRepositoryContext: async (
          _projectId: string,
          context: ProjectContext,
          updatedAt: Date
        ) => makeProject({ context, updatedAt }),
        appendProjectEvent: async (input: Omit<ProjectEvent, "id">) => ({
          id: "event-1",
          ...input
        })
      }
    );

    expect(result.context.repository?.repositoryFullName).toBe(
      "hanaessam/e-commerce-nodejs-web-service"
    );
    expect(result.context.repository?.repositoryUrl).toBe(
      "https://github.com/hanaessam/e-commerce-nodejs-web-service"
    );
  });

  it("rejects repository names outside owner/repo format", async () => {
    await expect(
      startRepositoryContextAuthorization(
        {
          projectId: "project-1",
          ownerId: "user-1",
          repositoryFullName: "not-a-valid-name"
        },
        {
          findProjectById: async () => makeProject(),
          signState: () => "state",
          githubClientId: "client-id",
          callbackUrl: "http://localhost/callback"
        }
      )
    ).rejects.toThrow("Repository must use owner/repo format");
  });

  it("stores only a generated summary and warnings for accessible repositories", async () => {
    let summarizedPaths: string[] = [];
    let savedContext: ProjectContext | null = null;
    let eventKind: ProjectEvent["kind"] | null = null;

    const result = await connectRepositoryContext(
      {
        projectId: "project-1",
        ownerId: "user-1",
        repositoryFullName: "hana/shop-api",
        accessToken: "transient-token"
      },
      {
        now: () => new Date("2026-06-03T00:00:00.000Z"),
        findProjectById: async () => makeProject(),
        readRepositoryFiles: async () => [
          {
            path: "models/Product.ts",
            content: "Product schema with price and category"
          },
          {
            path: ".env",
            content: "MONGODB_URI=mongodb://secret"
          },
          {
            path: "README.md",
            content: "E-commerce app for products and orders"
          }
        ],
        summarizeRepositoryContext: async (input: {
          files: Array<{ path: string; content: string }>;
        }) => {
          summarizedPaths = input.files.map((file: { path: string }) => file.path);
          return {
            summary: "Repository describes products, orders, carts, and reviews.",
            contextCategories: [
              "models",
              "documentation",
              "domain_terms"
            ] as RepositoryContextCategory[],
            warnings: [
              {
                code: "secret_like_file_omitted",
                message: "Secret-like files were omitted from repository context.",
                severity: "warning"
              }
            ] as ContextWarning[]
          };
        },
        saveRepositoryContext: async (
          _projectId: string,
          context: ProjectContext,
          updatedAt: Date
        ) => {
          savedContext = context;
          return makeProject({ context, updatedAt });
        },
        appendProjectEvent: async (input: Omit<ProjectEvent, "id">) => {
          eventKind = input.kind;
          return { id: "event-1", ...input };
        }
      }
    );

    expect(summarizedPaths).toEqual(["models/Product.ts", "README.md"]);
    expect((savedContext as ProjectContext | null)?.repository?.summary).toBe(
      "Repository describes products, orders, carts, and reviews."
    );
    expect(JSON.stringify(savedContext)).not.toContain("transient-token");
    expect(JSON.stringify(savedContext)).not.toContain("MONGODB_URI");
    expect(result.context.repository?.repositoryFullName).toBe("hana/shop-api");
    expect(eventKind).toBe("repository_context_connected");
  });

  it("returns a no-useful-context warning when repository files do not help", async () => {
    const result = await connectRepositoryContext(
      {
        projectId: "project-1",
        ownerId: "user-1",
        repositoryFullName: "hana/shop-api",
        accessToken: "transient-token"
      },
      {
        now: () => new Date("2026-06-03T00:00:00.000Z"),
        findProjectById: async () => makeProject(),
        readRepositoryFiles: async () => [{ path: "dist/bundle.js", content: "compiled" }],
        summarizeRepositoryContext: async () => {
          throw new Error("should not summarize irrelevant files");
        },
        saveRepositoryContext: async (
          _projectId: string,
          context: ProjectContext,
          updatedAt: Date
        ) =>
          makeProject({ context, updatedAt }),
        appendProjectEvent: async (input: Omit<ProjectEvent, "id">) => ({
          id: "event-1",
          ...input
        })
      }
    );

    expect(result.context.repository?.accessStatus).toBe("no_useful_context");
    expect(result.context.warnings[0]?.code).toBe("no_useful_repository_context");
  });
});
