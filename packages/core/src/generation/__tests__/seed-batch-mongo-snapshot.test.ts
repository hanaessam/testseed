import type { SeedBatch } from "@testseed/types";
import { snapshotSeedBatchFromMongo } from "../seed-batch-mongo-snapshot";
import type { DirectMongoClient, DirectMongoClientFactory, DirectMongoCollection, DirectMongoDatabase } from "../direct-mongodb-seeding";

describe("snapshotSeedBatchFromMongo", () => {
  it("rebuilds a dataset from tagged MongoDB documents", async () => {
    const users = new FakeCollection([
      { _id: "64f000000000000000000001", email: "ada@example.com", seedBatchId: "batch-1" }
    ]);
    const clientFactory = createFakeClientFactory({ users });

    const batch: SeedBatch = {
      id: "history-1",
      projectId: "project-1",
      actorId: "actor-1",
      seedBatchId: "batch-1",
      collectionCounts: { users: 1 },
      insertedDocumentIds: { users: ["64f000000000000000000001"] },
      collectionOrder: ["users"],
      status: "superseded",
      createdAt: new Date("2026-06-10T00:00:00.000Z")
    };

    const snapshot = await snapshotSeedBatchFromMongo(
      {
        connectionString: "mongodb://example.test/app",
        targetDatabaseName: "app",
        projectId: "project-1",
        schemaSnapshotId: "schema-1",
        batch
      },
      { clientFactory }
    );

    expect(snapshot).toEqual({
      projectId: "project-1",
      schemaSnapshotId: "schema-1",
      status: "valid",
      generationOrder: ["users"],
      collectionCounts: { users: 1 },
      collections: {
        users: [{ _id: "64f000000000000000000001", email: "ada@example.com" }]
      },
      validationResults: [],
      warnings: [],
      createdAt: "2026-06-10T00:00:00.000Z"
    });
  });
});

class FakeCollection implements DirectMongoCollection {
  constructor(private readonly records: Record<string, unknown>[]) {}

  async insertMany(): Promise<{ insertedCount: number }> {
    return { insertedCount: 0 };
  }

  async upsertMany(): Promise<{ upsertedCount: number; modifiedCount: number }> {
    return { upsertedCount: 0, modifiedCount: 0 };
  }

  async deleteMany(): Promise<{ deletedCount: number }> {
    return { deletedCount: 0 };
  }

  async findByIds(ids: string[]): Promise<Record<string, unknown>[]> {
    return this.records.filter((record) => ids.includes(String(record._id)));
  }

  async findBySeedBatchId(seedBatchId: string): Promise<Record<string, unknown>[]> {
    return this.records.filter((record) => record.seedBatchId === seedBatchId);
  }
}

function createFakeClientFactory(collections: Record<string, FakeCollection>): DirectMongoClientFactory {
  return {
    create(_connectionString: string, _options: { timeoutMs: number }) {
      return new FakeClient(collections);
    }
  };
}

class FakeClient implements DirectMongoClient {
  constructor(private readonly collections: Record<string, FakeCollection>) {}

  async connect(): Promise<void> {}

  db(_databaseName?: string): DirectMongoDatabase {
    return new FakeDatabase(this.collections);
  }

  async close(): Promise<void> {}
}

class FakeDatabase implements DirectMongoDatabase {
  constructor(private readonly collections: Record<string, FakeCollection>) {}

  databaseName = "app";

  async command(): Promise<unknown> {
    return { ok: 1 };
  }

  async listCollectionNames(): Promise<string[]> {
    return Object.keys(this.collections);
  }

  collection(name: string): DirectMongoCollection {
    return this.collections[name] ?? new FakeCollection([]);
  }
}
