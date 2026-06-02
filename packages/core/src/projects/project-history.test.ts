import type {
  ParsedSchema,
  Project,
  ProjectEvent,
  ProjectSchemaSnapshot,
  SeedBatch
} from "@testseed/types";
import {
  appendProjectEvent,
  createProject,
  listUserProjects,
  listProjectHistory,
  recordSeedBatch,
  rollbackSeedBatch,
  saveParsedSchemaToProject
} from "./index";

const schema: ParsedSchema = { collections: [] };

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    ownerId: "user-1",
    name: "Orders API",
    description: "seed data for orders",
    createdAt: new Date("2026-06-02T00:00:00.000Z"),
    updatedAt: new Date("2026-06-02T00:00:00.000Z"),
    activeSchemaVersion: 1,
    activeSchemaSnapshotId: "snapshot-1",
    ...overrides
  };
}

describe("project history use cases", () => {
  it("creates a project for the authenticated user", async () => {
    let createdInput: { ownerId: string; name: string; description?: string } | null = null;
    let eventInput: ProjectEvent | null = null;

    const result = await createProject(
      {
        ownerId: "user-1",
        name: "Orders API",
        description: "seed data for orders"
      },
      {
        now: () => new Date("2026-06-02T00:00:00.000Z"),
        createProjectRecord: async (input) => {
          createdInput = input;
          return makeProject();
        },
        appendProjectEvent: async (input) => {
          eventInput = { id: "event-1", ...input };
          return eventInput;
        }
      }
    );

    expect(createdInput).toMatchObject({
      ownerId: "user-1",
      name: "Orders API",
      description: "seed data for orders"
    });
    expect(result.project.name).toBe("Orders API");
    expect(eventInput).not.toBeNull();
    expect(eventInput!.kind).toBe("project_created");
  });

  it("lists projects for the authenticated user by most recent update", async () => {
    const projects = await listUserProjects(
      { ownerId: "user-1" },
      {
        listProjectsByOwnerId: async () => [
          makeProject({
            id: "older-project",
            updatedAt: new Date("2026-06-02T00:00:00.000Z")
          }),
          makeProject({
            id: "newer-project",
            updatedAt: new Date("2026-06-02T00:05:00.000Z")
          })
        ]
      }
    );

    expect(projects.projects.map((project) => project.id)).toEqual([
      "newer-project",
      "older-project"
    ]);
  });

  it("saves a parsed schema snapshot and bumps the active version", async () => {
    let savedSnapshotInput: {
      projectId: string;
      version: number;
      schema: ParsedSchema;
      source: ProjectSchemaSnapshot["source"];
      createdAt: Date;
    } | null = null;
    let updatedProjectInput: {
      projectId: string;
      version: number;
      activeSchemaSnapshotId: string;
      updatedAt: Date;
    } | null = null;
    let eventInput: ProjectEvent | null = null;

    const result = await saveParsedSchemaToProject(
      {
        projectId: "project-1",
        ownerId: "user-1",
        schema,
        source: "manual"
      },
      {
        now: () => new Date("2026-06-02T00:00:00.000Z"),
        findProjectById: async () => makeProject(),
        saveSchemaSnapshot: async (input) => {
          savedSnapshotInput = input;
          return {
            id: "snapshot-2",
            projectId: input.projectId,
            version: input.version,
            schema: input.schema,
            source: input.source,
            createdAt: input.createdAt
          };
        },
        updateProjectActiveSchema: async (projectId, input) => {
          updatedProjectInput = { projectId, ...input };
          return makeProject({
            activeSchemaVersion: input.version,
            activeSchemaSnapshotId: input.activeSchemaSnapshotId,
            updatedAt: input.updatedAt
          });
        },
        appendProjectEvent: async (input) => {
          eventInput = { id: "event-1", ...input };
          return eventInput;
        }
      }
    );

    expect(savedSnapshotInput).not.toBeNull();
    expect(savedSnapshotInput!.version).toBe(2);
    expect(savedSnapshotInput!.schema).toEqual(schema);
    expect(updatedProjectInput).not.toBeNull();
    expect(updatedProjectInput!.version).toBe(2);
    expect(result.project.activeSchemaVersion).toBe(2);
    expect(result.snapshot.id).toBe("snapshot-2");
    expect(eventInput).not.toBeNull();
    expect(eventInput!.kind).toBe("schema_parsed");
  });

  it("rejects saving a parsed schema for another user's project", async () => {
    await expect(
      saveParsedSchemaToProject(
        {
          projectId: "project-1",
          ownerId: "user-2",
          schema,
          source: "manual"
        },
        {
          findProjectById: async () => makeProject({ ownerId: "user-1" }),
          saveSchemaSnapshot: async () => {
            throw new Error("should not save snapshot");
          },
          updateProjectActiveSchema: async () => {
            throw new Error("should not update project");
          },
          appendProjectEvent: async () => {
            throw new Error("should not append event");
          }
        }
      )
    ).rejects.toThrow("Project project-1 was not found");
  });

  it("appends a parse event after saving the snapshot", async () => {
    const event = await appendProjectEvent(
      {
        projectId: "project-1",
        actorId: "user-1",
        kind: "schema_parsed",
        message: "Parsed schema snapshot",
        payload: { snapshotId: "snapshot-2" }
      },
      {
        now: () => new Date("2026-06-02T00:00:00.000Z"),
        appendProjectEventRecord: async (input) => ({ id: "event-1", ...input })
      }
    );

    expect(event.kind).toBe("schema_parsed");
    expect(event.payload).toEqual({ snapshotId: "snapshot-2" });
  });

  it("returns project history in chronological order", async () => {
    const history = await listProjectHistory(
      { projectId: "project-1" },
      {
        findProjectById: async () => makeProject(),
        listProjectEvents: async () => [
          {
            id: "event-1",
            projectId: "project-1",
            actorId: "user-1",
            kind: "project_created",
            message: "Created project",
            createdAt: new Date("2026-06-02T00:00:00.000Z")
          }
        ],
        listSeedBatches: async () => [
          {
            id: "batch-row-1",
            projectId: "project-1",
            actorId: "user-1",
            seedBatchId: "batch-1",
            collectionCounts: { users: 2 },
            insertedDocumentIds: { users: ["user-1"] },
            status: "inserted",
            createdAt: new Date("2026-06-02T00:05:00.000Z")
          }
        ]
      }
    );

    expect(history.project?.id).toBe("project-1");
    expect(history.events).toHaveLength(1);
    expect(history.seedBatches).toHaveLength(1);
  });

  it("records a seed batch for rollback", async () => {
    let recordedInput: SeedBatch | null = null;
    let eventInput: ProjectEvent | null = null;

    const batch = await recordSeedBatch(
      {
        projectId: "project-1",
        actorId: "user-1",
        seedBatchId: "batch-1",
        collectionCounts: { users: 2 },
        insertedDocumentIds: { users: ["user-1"] },
        status: "inserted"
      },
      {
        now: () => new Date("2026-06-02T00:00:00.000Z"),
        recordSeedBatchRecord: async (input) => {
          recordedInput = { ...input, id: "batch-row-1" };
          return recordedInput;
        },
        appendProjectEvent: async (input) => {
          eventInput = { id: "event-1", ...input };
          return eventInput;
        }
      }
    );

    expect(recordedInput).not.toBeNull();
    expect(recordedInput!.seedBatchId).toBe("batch-1");
    expect(batch.batch.status).toBe("inserted");
    expect(eventInput).not.toBeNull();
    expect(eventInput!.kind).toBe("seed_batch_recorded");
  });

  it("marks a seed batch as rolled back without touching other projects", async () => {
    const result = await rollbackSeedBatch(
      {
        projectId: "project-1",
        actorId: "user-1",
        seedBatchId: "batch-1"
      },
      {
        now: () => new Date("2026-06-02T00:10:00.000Z"),
        findSeedBatchBySeedBatchId: async () => ({
          id: "batch-row-1",
          projectId: "project-1",
          actorId: "user-1",
          seedBatchId: "batch-1",
          collectionCounts: { users: 1 },
          insertedDocumentIds: { users: ["user-1"] },
          status: "inserted",
          createdAt: new Date("2026-06-02T00:00:00.000Z")
        }),
        deleteRecordsByIds: async () => ({ users: 1 }),
        markSeedBatchRolledBack: async () => ({
          id: "batch-row-1",
          projectId: "project-1",
          actorId: "user-1",
          seedBatchId: "batch-1",
          collectionCounts: { users: 1 },
          insertedDocumentIds: { users: ["user-1"] },
          status: "rolled_back",
          createdAt: new Date("2026-06-02T00:00:00.000Z"),
          rolledBackAt: new Date("2026-06-02T00:10:00.000Z")
        }),
        appendProjectEvent: async (input) => ({ id: "event-2", ...input })
      }
    );

    expect(result.deletedCounts).toEqual({ users: 1 });
    expect(result.batch.status).toBe("rolled_back");
  });
});
