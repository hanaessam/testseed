import type { Project, ProjectContext, ProjectEvent } from "@testseed/types";
import { removeRepositoryContext, updateProjectContext } from "../index";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    ownerId: "user-1",
    name: "Commerce API",
    description: "Old description",
    createdAt: new Date("2026-06-02T00:00:00.000Z"),
    updatedAt: new Date("2026-06-02T00:00:00.000Z"),
    activeSchemaVersion: 0,
    ...overrides
  };
}

describe("project context use cases", () => {
  it("trims and saves a project context description for the owner", async () => {
    let savedDescription: string | undefined;
    let savedEventKind: ProjectEvent["kind"] | null = null;

    const result = await updateProjectContext(
      {
        projectId: "project-1",
        ownerId: "user-1",
        description: "  E-commerce marketplace with orders and reviews  "
      },
      {
        now: () => new Date("2026-06-03T00:00:00.000Z"),
        findProjectById: async () => makeProject(),
        updateProjectContextRecord: async (
          _projectId: string,
          input: { description?: string; context: ProjectContext; updatedAt: Date }
        ) => {
          savedDescription = input.description;
          return makeProject({
            description: input.description,
            context: input.context,
            updatedAt: input.updatedAt
          });
        },
        appendProjectEvent: async (input: Omit<ProjectEvent, "id">) => {
          savedEventKind = input.kind;
          return { id: "event-1", ...input };
        }
      }
    );

    expect(savedDescription).toBe("E-commerce marketplace with orders and reviews");
    expect(result.project.context?.description).toBe(
      "E-commerce marketplace with orders and reviews"
    );
    expect(result.project.context?.warnings).toEqual([]);
    expect(savedEventKind).toBe("project_context_updated");
  });

  it("allows an empty description with a generic-data warning", async () => {
    const result = await updateProjectContext(
      {
        projectId: "project-1",
        ownerId: "user-1",
        description: "   "
      },
      {
        now: () => new Date("2026-06-03T00:00:00.000Z"),
        findProjectById: async () => makeProject(),
        updateProjectContextRecord: async (
          _projectId: string,
          input: { description?: string; context: ProjectContext; updatedAt: Date }
        ) =>
          makeProject({
            description: input.description,
            context: input.context,
            updatedAt: input.updatedAt
          }),
        appendProjectEvent: async (input: Omit<ProjectEvent, "id">) => ({
          id: "event-1",
          ...input
        })
      }
    );

    expect(result.project.description).toBeUndefined();
    expect(result.project.context?.warnings).toEqual([
      {
        code: "empty_description",
        message: "Project description is empty, so generated data may be generic.",
        severity: "warning"
      }
    ]);
  });

  it("rejects context updates for another user's project", async () => {
    await expect(
      updateProjectContext(
        {
          projectId: "project-1",
          ownerId: "user-2",
          description: "E-commerce"
        },
        {
          findProjectById: async () => makeProject({ ownerId: "user-1" }),
          updateProjectContextRecord: async () => {
            throw new Error("should not save context");
          },
          appendProjectEvent: async () => {
            throw new Error("should not append event");
          }
        }
      )
    ).rejects.toThrow("Project project-1 was not found");
  });

  it("rejects descriptions over the maximum length", async () => {
    await expect(
      updateProjectContext(
        {
          projectId: "project-1",
          ownerId: "user-1",
          description: "x".repeat(2001)
        },
        {
          findProjectById: async () => makeProject(),
          updateProjectContextRecord: async () => {
            throw new Error("should not save context");
          },
          appendProjectEvent: async () => {
            throw new Error("should not append event");
          }
        }
      )
    ).rejects.toThrow("Project description must be 2000 characters or fewer");
  });

  it("removes repository context while preserving the description", async () => {
    const result = await removeRepositoryContext(
      {
        projectId: "project-1",
        ownerId: "user-1"
      },
      {
        now: () => new Date("2026-06-03T00:00:00.000Z"),
        findProjectById: async () =>
          makeProject({
            context: {
              description: "E-commerce marketplace",
              repository: {
                provider: "github",
                repositoryFullName: "hana/shop-api",
                repositoryUrl: "https://github.com/hana/shop-api",
                accessStatus: "connected",
                summary: "Products and orders",
                contextCategories: ["models"],
                warnings: [],
                connectedAt: new Date("2026-06-02T00:00:00.000Z")
              },
              warnings: [],
              updatedAt: new Date("2026-06-02T00:00:00.000Z")
            }
          }),
        removeProjectRepositoryContext: async (
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

    expect(result.context.description).toBe("E-commerce marketplace");
    expect(result.context.repository).toBeUndefined();
    expect(JSON.stringify(result.context)).not.toContain("Products and orders");
  });
});
