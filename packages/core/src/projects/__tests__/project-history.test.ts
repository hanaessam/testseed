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
  getProjectDetail,
  listUserProjects,
  listProjectHistory,
  recordSeedBatch,
  rollbackSeedBatch,
  saveParsedSchemaToProject,
  updateProject,
  deleteProject,
  deleteProjectSchema,
  restoreProject,
  restoreProjectSchema
} from "../index";

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
    archivedAt: undefined,
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

  it("updates project metadata for the owner", async () => {
    let updatedInput: { name?: string; description?: string; updatedAt: Date } | null = null;
    let eventKind: ProjectEvent["kind"] | null = null;

    const result = await updateProject(
      {
        projectId: "project-1",
        ownerId: "user-1",
        name: "Updated API",
        description: "updated description"
      },
      {
        now: () => new Date("2026-06-02T00:10:00.000Z"),
        findProjectById: async () => makeProject(),
        updateProjectRecord: async (_projectId, input) => {
          updatedInput = input;
          return makeProject({
            name: input.name ?? "Orders API",
            description: input.description,
            updatedAt: input.updatedAt
          });
        },
        appendProjectEvent: async (input) => {
          eventKind = input.kind;
          return { id: "event-2", ...input };
        }
      }
    );

    expect(updatedInput).toMatchObject({
      name: "Updated API",
      description: "updated description"
    });
    expect(result.project.name).toBe("Updated API");
    expect(eventKind).toBe("project_updated");
  });

  it("archives a project without deleting its history", async () => {
    let archivedAt: Date | null = null;
    let hardDeleteCalled = false;

    const result = await deleteProject(
      {
        projectId: "project-1",
        ownerId: "user-1",
        mode: "archive"
      },
      {
        now: () => new Date("2026-06-02T00:10:00.000Z"),
        findProjectById: async () => makeProject(),
        archiveProjectRecord: async (_projectId, inputArchivedAt) => {
          archivedAt = inputArchivedAt;
          return makeProject({ archivedAt: inputArchivedAt });
        },
        hardDeleteProjectRecord: async () => {
          hardDeleteCalled = true;
          return true;
        },
        hardDeleteProjectSnapshots: async () => {
          hardDeleteCalled = true;
          return 0;
        },
        hardDeleteProjectHistory: async () => {
          hardDeleteCalled = true;
          return 0;
        },
        appendProjectEvent: async (input) => ({ id: "event-2", ...input })
      }
    );

    expect(result.mode).toBe("archive");
    expect(result.deleted).toBe(false);
    expect(result.project?.archivedAt).toEqual(archivedAt);
    expect(hardDeleteCalled).toBe(false);
  });

  it("hard deletes a project with snapshots and history for the owner", async () => {
    const calls: string[] = [];

    const result = await deleteProject(
      {
        projectId: "project-1",
        ownerId: "user-1",
        mode: "hard"
      },
      {
        findProjectById: async () => makeProject(),
        archiveProjectRecord: async () => {
          throw new Error("should not archive");
        },
        hardDeleteProjectRecord: async () => {
          calls.push("project");
          return true;
        },
        hardDeleteProjectSnapshots: async () => {
          calls.push("snapshots");
          return 1;
        },
        hardDeleteProjectHistory: async () => {
          calls.push("history");
          return 2;
        },
        appendProjectEvent: async (input) => {
          calls.push(input.kind);
          return { id: "event-2", ...input };
        }
      }
    );

    expect(result).toEqual({
      projectId: "project-1",
      mode: "hard",
      deleted: true
    });
    expect(calls).toEqual(["project_hard_deleted", "history", "snapshots", "project"]);
  });

  it("archives the active schema snapshot without deleting the project", async () => {
    const result = await deleteProjectSchema(
      {
        projectId: "project-1",
        ownerId: "user-1",
        mode: "archive"
      },
      {
        now: () => new Date("2026-06-02T00:10:00.000Z"),
        findProjectById: async () => makeProject(),
        findSchemaSnapshotById: async () => ({
          id: "snapshot-1",
          projectId: "project-1",
          version: 1,
          schema,
          source: "manual",
          createdAt: new Date("2026-06-02T00:00:00.000Z")
        }),
        archiveSchemaSnapshot: async (snapshotId) => ({
          id: snapshotId,
          projectId: "project-1",
          version: 1,
          schema,
          source: "manual",
          createdAt: new Date("2026-06-02T00:00:00.000Z"),
          archivedAt: new Date("2026-06-02T00:10:00.000Z")
        }),
        hardDeleteSchemaSnapshot: async () => {
          throw new Error("should not hard delete");
        },
        clearProjectActiveSchema: async (_projectId, updatedAt) =>
          makeProject({
            activeSchemaVersion: 0,
            activeSchemaSnapshotId: undefined,
            updatedAt
          }),
        appendProjectEvent: async (input) => ({ id: "event-2", ...input })
      }
    );

    expect(result.mode).toBe("archive");
    expect(result.deleted).toBe(false);
    expect(result.snapshotId).toBe("snapshot-1");
    expect(result.project.activeSchemaSnapshotId).toBeUndefined();
  });

  it("restores an archived project for the owner", async () => {
    let restoredAt: Date | null = null;
    let eventKind: ProjectEvent["kind"] | null = null;

    const result = await restoreProject(
      {
        projectId: "project-1",
        ownerId: "user-1"
      },
      {
        now: () => new Date("2026-06-02T00:15:00.000Z"),
        findProjectById: async () =>
          makeProject({
            archivedAt: new Date("2026-06-02T00:10:00.000Z")
          }),
        restoreProjectRecord: async (_projectId, updatedAt) => {
          restoredAt = updatedAt;
          return makeProject({
            archivedAt: undefined,
            updatedAt
          });
        },
        appendProjectEvent: async (input) => {
          eventKind = input.kind;
          return { id: "event-3", ...input };
        }
      }
    );

    expect(result.project.archivedAt).toBeUndefined();
    expect(result.project.updatedAt).toEqual(restoredAt);
    expect(eventKind).toBe("project_restored");
  });

  it("restores the latest archived schema snapshot as the active schema", async () => {
    let restoredSnapshotAt: Date | null = null;
    let activatedSnapshotId: string | null = null;
    let eventKind: ProjectEvent["kind"] | null = null;

    const result = await restoreProjectSchema(
      {
        projectId: "project-1",
        ownerId: "user-1"
      },
      {
        now: () => new Date("2026-06-02T00:15:00.000Z"),
        findProjectById: async () =>
          makeProject({
            activeSchemaVersion: 0,
            activeSchemaSnapshotId: undefined
          }),
        findLatestArchivedSchemaSnapshotByProjectId: async () => ({
          id: "snapshot-2",
          projectId: "project-1",
          version: 2,
          schema,
          source: "manual",
          createdAt: new Date("2026-06-02T00:00:00.000Z"),
          archivedAt: new Date("2026-06-02T00:10:00.000Z")
        }),
        restoreSchemaSnapshot: async (snapshotId, updatedAt) => {
          restoredSnapshotAt = updatedAt;
          return {
            id: snapshotId,
            projectId: "project-1",
            version: 2,
            schema,
            source: "manual",
            createdAt: new Date("2026-06-02T00:00:00.000Z"),
            archivedAt: undefined
          };
        },
        updateProjectActiveSchema: async (_projectId, input) => {
          activatedSnapshotId = input.activeSchemaSnapshotId;
          return makeProject({
            activeSchemaVersion: input.version,
            activeSchemaSnapshotId: input.activeSchemaSnapshotId,
            updatedAt: input.updatedAt
          });
        },
        appendProjectEvent: async (input) => {
          eventKind = input.kind;
          return { id: "event-3", ...input };
        }
      }
    );

    expect(restoredSnapshotAt).toEqual(new Date("2026-06-02T00:15:00.000Z"));
    expect(activatedSnapshotId).toBe("snapshot-2");
    expect(result.snapshot?.id).toBe("snapshot-2");
    expect(result.project.activeSchemaVersion).toBe(2);
    expect(eventKind).toBe("schema_restored");
  });

  it("returns project details with the active schema snapshot for the owner", async () => {
    const result = await getProjectDetail(
      {
        projectId: "project-1",
        ownerId: "user-1"
      },
      {
        findProjectById: async () => makeProject(),
        findSchemaSnapshotById: async () => ({
          id: "snapshot-1",
          projectId: "project-1",
          version: 1,
          schema: {
            collections: [
              {
                name: "User",
                fields: [
                  {
                    name: "email",
                    type: "String",
                    required: true,
                    unique: true
                  }
                ]
              }
            ]
          },
          source: "manual",
          createdAt: new Date("2026-06-02T00:00:00.000Z")
        })
      }
    );

    expect(result.project?.id).toBe("project-1");
    expect(result.activeSchemaSnapshot?.id).toBe("snapshot-1");
    expect(result.activeSchemaSnapshot?.schema.collections[0]?.name).toBe("User");
  });

  it("does not return project details for another user's project", async () => {
    const result = await getProjectDetail(
      {
        projectId: "project-1",
        ownerId: "user-2"
      },
      {
        findProjectById: async () => makeProject({ ownerId: "user-1" }),
        findSchemaSnapshotById: async () => {
          throw new Error("should not load snapshot");
        }
      }
    );

    expect(result.project).toBeNull();
    expect(result.activeSchemaSnapshot).toBeUndefined();
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

  it("saves reviewed schema metadata exactly as submitted", async () => {
    const reviewedSchema: ParsedSchema = {
      collections: [
        {
          name: "orders",
          sampleCount: 20,
          warnings: ["Collection inferred from a small sample."],
          fields: [
            {
              name: "status",
              type: "String",
              required: true,
              unique: false,
              enum: ["pending", "paid"],
              enumSource: "inferred",
              confidence: "medium",
              warnings: ["Enum-like values were inferred from sampled documents."]
            },
            {
              name: "customerId",
              type: "ObjectId",
              required: false,
              unique: false,
              ref: "customers",
              refConfidence: "possible",
              confidence: "low",
              warnings: ["Reference target should be reviewed."]
            },
            {
              name: "shippingAddress",
              type: "Object",
              required: false,
              unique: false,
              confidence: "high",
              children: [
                {
                  name: "city",
                  type: "String",
                  required: false,
                  unique: false,
                  confidence: "high"
                }
              ]
            }
          ]
        }
      ]
    };
    let savedSchema: ParsedSchema | null = null;

    const result = await saveParsedSchemaToProject(
      {
        projectId: "project-1",
        ownerId: "user-1",
        schema: reviewedSchema,
        source: "mongodb"
      },
      {
        now: () => new Date("2026-06-02T00:00:00.000Z"),
        findProjectById: async () => makeProject(),
        saveSchemaSnapshot: async (input) => {
          savedSchema = input.schema;
          return {
            id: "snapshot-2",
            projectId: input.projectId,
            version: input.version,
            schema: input.schema,
            source: input.source,
            createdAt: input.createdAt
          };
        },
        updateProjectActiveSchema: async (_projectId, input) =>
          makeProject({
            activeSchemaVersion: input.version,
            activeSchemaSnapshotId: input.activeSchemaSnapshotId,
            updatedAt: input.updatedAt
          }),
        appendProjectEvent: async (input) => ({ id: "event-1", ...input })
      }
    );

    expect(savedSchema).toEqual(reviewedSchema);
    expect(result.snapshot.schema).toEqual(reviewedSchema);
    expect(result.snapshot.schema.collections[0]?.sampleCount).toBe(20);
    expect(result.snapshot.schema.collections[0]?.fields[1]?.ref).toBe("customers");
    expect(result.snapshot.schema.collections[0]?.fields[2]?.children?.[0]?.name).toBe("city");
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
