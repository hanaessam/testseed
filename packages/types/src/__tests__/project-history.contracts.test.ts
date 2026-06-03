import type {
  CurrentUserResponse,
  ListProjectsResponse,
  Project,
  ProjectEvent,
  ProjectEventKind,
  ProjectDetailResponse,
  ProjectHistoryResponse,
  ProjectSchemaSnapshot,
  SeedBatch
} from "../index";

const project: Project = {
  id: "project-1",
  ownerId: "user-1",
  name: "Orders API",
  description: "Seed data for the orders service",
  createdAt: new Date("2026-06-02T00:00:00.000Z"),
  updatedAt: new Date("2026-06-02T00:00:00.000Z"),
  activeSchemaVersion: 1,
  activeSchemaSnapshotId: "snapshot-1"
};

const snapshot: ProjectSchemaSnapshot = {
  id: "snapshot-1",
  projectId: project.id,
  version: 1,
  schema: { collections: [] },
  source: "manual",
  createdAt: new Date("2026-06-02T00:00:00.000Z")
};

const eventKind: ProjectEventKind = "schema_parsed";

const event: ProjectEvent = {
  id: "event-1",
  projectId: project.id,
  actorId: project.ownerId,
  kind: eventKind,
  message: "Parsed the project schema",
  payload: { snapshotId: snapshot.id },
  createdAt: new Date("2026-06-02T00:00:00.000Z")
};

const seedBatch: SeedBatch = {
  id: "seed-batch-1",
  projectId: project.id,
  actorId: project.ownerId,
  seedBatchId: "batch-1",
  collectionCounts: { users: 2, orders: 4 },
  insertedDocumentIds: { users: ["user-doc-1"], orders: ["order-doc-1", "order-doc-2"] },
  status: "pending",
  createdAt: new Date("2026-06-02T00:00:00.000Z")
};

const listProjectsResponse: ListProjectsResponse = {
  projects: [project]
};

const currentUserResponse: CurrentUserResponse = {
  user: {
    id: project.ownerId,
    email: "dev@testseed.local",
    createdAt: new Date("2026-06-02T00:00:00.000Z")
  }
};

const projectHistoryResponse: ProjectHistoryResponse = {
  project,
  events: [event],
  seedBatches: [seedBatch]
};

const projectDetailResponse: ProjectDetailResponse = {
  project,
  activeSchemaSnapshot: snapshot
};

void project;
void snapshot;
void event;
void seedBatch;
void listProjectsResponse;
void currentUserResponse;
void projectHistoryResponse;
void projectDetailResponse;
