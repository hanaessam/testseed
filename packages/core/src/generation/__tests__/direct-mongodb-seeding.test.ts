import type { GeneratedDataset, ParsedSchema } from "@testseed/types";
import {
  DIRECT_SEEDING_CONFIRMATION_WARNING,
  DirectMongoInsertManyError,
  DirectMongoSeedingError,
  type DirectMongoClient,
  type DirectMongoClientFactory,
  type DirectMongoCollection,
  type DirectMongoDatabase,
  buildDirectSeedingConfirmation,
  seedMongoDataset,
  testDirectMongoConnection
} from "../direct-mongodb-seeding";

const connectionString = "mongodb://user:secret@example.test/app";
const otherConnectionString = "mongodb://user:secret@example.test/other";
const seedBatchId = "11111111-1111-4111-8111-111111111111";
const userId = "64f000000000000000000001";
const orderId = "64f000000000000000000002";
const missingUserId = "64f000000000000000000099";

const schema: ParsedSchema = {
  collections: [
    {
      name: "users",
      fields: [
        { name: "email", type: "String", required: true, unique: true },
        { name: "role", type: "String", required: true, unique: false, enum: ["admin", "member"] }
      ]
    },
    {
      name: "orders",
      fields: [
        { name: "userId", type: "ObjectId", required: true, unique: false, ref: "users" },
        { name: "total", type: "Number", required: true, unique: false }
      ]
    }
  ]
};

function validDataset(overrides: Partial<GeneratedDataset> = {}): GeneratedDataset {
  return {
    projectId: "project-1",
    schemaSnapshotId: "schema-1",
    status: "valid",
    generationOrder: ["users", "orders"],
    collectionCounts: {
      users: 1,
      orders: 1
    },
    collections: {
      users: [
        {
          _id: userId,
          email: "ada@example.com",
          role: "admin"
        }
      ],
      orders: [
        {
          _id: orderId,
          userId,
          total: 42
        }
      ]
    },
    validationResults: [],
    warnings: [],
    createdAt: "2026-06-09T00:00:00.000Z",
    ...overrides
  };
}

class FakeCollection implements DirectMongoCollection {
  inserted: Record<string, unknown>[][] = [];
  constructor(private readonly failWith?: Error) {}

  async insertMany(records: Record<string, unknown>[]): Promise<{ insertedCount: number; insertedIds?: string[] }> {
    if (this.failWith) {
      throw this.failWith;
    }
    this.inserted.push(records);
    return { insertedCount: records.length, insertedIds: records.map((record) => String(record._id)) };
  }
}

class FakeDatabase implements DirectMongoDatabase {
  commandCalls: Array<{ ping: 1 }> = [];
  collections = new Map<string, FakeCollection>();

  constructor(
    public databaseName = "app",
    private readonly pingError?: Error,
    private readonly failingCollection?: string
  ) {}

  async command(command: { ping: 1 }): Promise<unknown> {
    this.commandCalls.push(command);
    if (this.pingError) {
      throw this.pingError;
    }
    return { ok: 1 };
  }

  collection(name: string): DirectMongoCollection {
    if (!this.collections.has(name)) {
      this.collections.set(
        name,
        new FakeCollection(
          this.failingCollection === name
            ? new Error(`insert failed for ${connectionString}`)
            : undefined
        )
      );
    }
    return this.collections.get(name) as FakeCollection;
  }
}

class FakeClient implements DirectMongoClient {
  connectCalls = 0;
  closeCalls = 0;
  dbNames: Array<string | undefined> = [];

  constructor(
    readonly database: FakeDatabase = new FakeDatabase(),
    private readonly connectError?: Error
  ) {}

  async connect(): Promise<void> {
    this.connectCalls += 1;
    if (this.connectError) {
      throw this.connectError;
    }
  }

  db(databaseName?: string): DirectMongoDatabase {
    this.dbNames.push(databaseName);
    return this.database;
  }

  async close(): Promise<void> {
    this.closeCalls += 1;
  }
}

function fakeDeps(client: FakeClient) {
  const createCalls: Array<{ connectionString: string; timeoutMs: number }> = [];
  const clientFactory: DirectMongoClientFactory = {
    create(receivedConnectionString, options) {
      createCalls.push({ connectionString: receivedConnectionString, timeoutMs: options.timeoutMs });
      return client;
    }
  };

  return {
    deps: {
      clientFactory,
      generateSeedBatchId: () => seedBatchId
    },
    createCalls
  };
}

function expectNoConnectionString(value: unknown): void {
  expect(JSON.stringify(value)).not.toContain(connectionString);
}

describe("testDirectMongoConnection", () => {
  it("returns a successful ping result with database name, token, fingerprint, and closes the client", async () => {
    const client = new FakeClient(new FakeDatabase("app"));
    const { deps, createCalls } = fakeDeps(client);

    const result = await testDirectMongoConnection({ connectionString }, deps);

    expect(result).toEqual({
      ok: true,
      databaseName: "app",
      connectionFingerprint: expect.any(String),
      connectionTestToken: expect.any(String),
      message: "Connection successful."
    });
    expect(result.connectionTestToken).toContain(result.connectionFingerprint as string);
    expect(client.database.commandCalls).toEqual([{ ping: 1 }]);
    expect(client.closeCalls).toBe(1);
    expect(createCalls).toEqual([{ connectionString, timeoutMs: 7000 }]);
    expectNoConnectionString(result);
  });

  it("returns sanitized failure and closes the client when connect or ping fails", async () => {
    const client = new FakeClient(new FakeDatabase("app"), new Error(`cannot connect ${connectionString}`));
    const { deps } = fakeDeps(client);

    const result = await testDirectMongoConnection({ connectionString }, deps);

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Connection failed.");
    expect(result.errorSummary).toContain("[connection string redacted]");
    expect(client.closeCalls).toBe(1);
    expectNoConnectionString(result);
  });

  it("rejects a missing connection string before creating a client", async () => {
    const client = new FakeClient();
    const { deps, createCalls } = fakeDeps(client);

    await expect(testDirectMongoConnection({ connectionString: " " }, deps)).rejects.toMatchObject({
      code: "DIRECT_SEED_CONNECTION_STRING_REQUIRED"
    });
    expect(createCalls).toEqual([]);
  });

  it("clamps timeout options to the 5-10 second window", async () => {
    const lowClient = new FakeClient();
    const low = fakeDeps(lowClient);
    await testDirectMongoConnection({ connectionString, timeoutMs: 1 }, low.deps);

    const highClient = new FakeClient();
    const high = fakeDeps(highClient);
    await testDirectMongoConnection({ connectionString, timeoutMs: 99999 }, high.deps);

    expect(low.createCalls[0].timeoutMs).toBe(5000);
    expect(high.createCalls[0].timeoutMs).toBe(10000);
  });
});

describe("buildDirectSeedingConfirmation", () => {
  it("summarizes target database, ordered collections, counts, total, and warning", () => {
    const summary = buildDirectSeedingConfirmation({
      targetDatabaseName: "app",
      dataset: validDataset()
    });

    expect(summary).toEqual({
      targetDatabaseName: "app",
      orderedCollections: ["users", "orders"],
      collectionCounts: { users: 1, orders: 1 },
      totalRecordCount: 2,
      warning: DIRECT_SEEDING_CONFIRMATION_WARNING
    });
  });

  it("uses actual dataset collection lengths instead of stale count metadata", () => {
    const summary = buildDirectSeedingConfirmation({
      targetDatabaseName: "app",
      dataset: validDataset({ collectionCounts: { users: 99, orders: 99 } })
    });

    expect(summary.collectionCounts).toEqual({ users: 1, orders: 1 });
    expect(summary.totalRecordCount).toBe(2);
  });

  it("rejects empty datasets", () => {
    expect(() =>
      buildDirectSeedingConfirmation({
        targetDatabaseName: "app",
        dataset: validDataset({
          collectionCounts: { users: 0, orders: 0 },
          collections: { users: [], orders: [] }
        })
      })
    ).toThrow(DirectMongoSeedingError);
  });

  it("rejects generationOrder missing a non-empty collection", () => {
    expect(() =>
      buildDirectSeedingConfirmation({
        targetDatabaseName: "app",
        dataset: validDataset({ generationOrder: ["users"] })
      })
    ).toThrow(DirectMongoSeedingError);
  });
});

describe("seedMongoDataset", () => {
  async function successfulConnectionToken() {
    const client = new FakeClient();
    const { deps } = fakeDeps(client);
    const result = await testDirectMongoConnection({ connectionString }, deps);
    return result.connectionTestToken as string;
  }

  it("rejects unconfirmed seeding before creating a client", async () => {
    const client = new FakeClient();
    const { deps, createCalls } = fakeDeps(client);

    await expect(
      seedMongoDataset({
        connectionString,
        connectionTestToken: await successfulConnectionToken(),
        schema,
        dataset: validDataset(),
        targetDatabaseName: "app",
        confirmed: false
      }, deps)
    ).rejects.toMatchObject({ code: "DIRECT_SEED_CONFIRMATION_REQUIRED" });
    expect(createCalls).toEqual([]);
  });

  it("treats a cancelled confirmation as zero inserted records", async () => {
    const database = new FakeDatabase("app");
    const client = new FakeClient(database);
    const { deps, createCalls } = fakeDeps(client);

    await expect(
      seedMongoDataset({
        connectionString,
        connectionTestToken: await successfulConnectionToken(),
        schema,
        dataset: validDataset(),
        targetDatabaseName: "app",
        confirmed: false
      }, deps)
    ).rejects.toMatchObject({ code: "DIRECT_SEED_CONFIRMATION_REQUIRED" });

    expect(createCalls).toEqual([]);
    expect(database.collections.size).toBe(0);
    expect(client.closeCalls).toBe(0);
  });

  it("rejects missing or mismatched connection test tokens before creating a client", async () => {
    const client = new FakeClient();
    const { deps, createCalls } = fakeDeps(client);
    const otherToken = (
      await testDirectMongoConnection({ connectionString: otherConnectionString }, fakeDeps(new FakeClient()).deps)
    ).connectionTestToken;

    await expect(
      seedMongoDataset({
        connectionString,
        connectionTestToken: otherToken,
        schema,
        dataset: validDataset(),
        targetDatabaseName: "app",
        confirmed: true
      }, deps)
    ).rejects.toMatchObject({ code: "DIRECT_SEED_CONNECTION_TEST_REQUIRED" });
    expect(createCalls).toEqual([]);
  });

  it("blocks invalid datasets before creating a client", async () => {
    const client = new FakeClient();
    const { deps, createCalls } = fakeDeps(client);

    await expect(
      seedMongoDataset({
        connectionString,
        connectionTestToken: await successfulConnectionToken(),
        schema,
        dataset: validDataset({
          collections: {
            users: [{ _id: userId, email: "ada@example.com", role: "admin" }],
            orders: [{ _id: orderId, userId: missingUserId, total: 42 }]
          }
        }),
        targetDatabaseName: "app",
        confirmed: true
      }, deps)
    ).rejects.toMatchObject({
      code: "DIRECT_SEED_VALIDATION_FAILED",
      validationResults: expect.arrayContaining([expect.objectContaining({ code: "REFERENCE_NOT_FOUND" })])
    });
    expect(createCalls).toEqual([]);
  });

  it("seeds multiple collections in generationOrder with one seedBatchId", async () => {
    const database = new FakeDatabase("app");
    const client = new FakeClient(database);
    const { deps } = fakeDeps(client);

    const report = await seedMongoDataset({
      connectionString,
      connectionTestToken: await successfulConnectionToken(),
      schema,
      dataset: validDataset(),
      targetDatabaseName: "app",
      confirmed: true
    }, deps);

    const userInsert = database.collections.get("users")?.inserted[0] ?? [];
    const orderInsert = database.collections.get("orders")?.inserted[0] ?? [];
    expect([...database.collections.keys()]).toEqual(["users", "orders"]);
    expect(userInsert[0]).toMatchObject({ _id: userId, email: "ada@example.com", seedBatchId });
    expect(orderInsert[0]).toMatchObject({ _id: orderId, userId, seedBatchId });
    expect(report.successfulCollections.map((collection) => collection.collectionName)).toEqual(["users", "orders"]);
    expect(report.insertedRecordCounts).toEqual({ users: 1, orders: 1 });
    expect(report.insertedDocumentIds).toEqual({ users: [userId], orders: [orderId] });
    expect(report.totalInsertedCount).toBe(2);
    expect(report.rollback).toEqual({
      seedBatchId,
      collections: [
        { collectionName: "users", insertedCount: 1 },
        { collectionName: "orders", insertedCount: 1 }
      ]
    });
    expect(client.dbNames).toContain("app");
    expect(client.closeCalls).toBe(1);
    expectNoConnectionString(report);
  });

  it("inserts records only after explicit confirmation", async () => {
    const database = new FakeDatabase("app");
    const client = new FakeClient(database);
    const { deps } = fakeDeps(client);

    const report = await seedMongoDataset({
      connectionString,
      connectionTestToken: await successfulConnectionToken(),
      schema,
      dataset: validDataset(),
      targetDatabaseName: "app",
      confirmed: true
    }, deps);

    expect(report.seedBatchId).toBe(seedBatchId);
    expect(report.insertedRecordCounts).toEqual({ users: 1, orders: 1 });
    expect(database.collections.get("users")?.inserted[0]).toHaveLength(1);
    expect(database.collections.get("orders")?.inserted[0]).toHaveLength(1);
  });

  it("does not mutate the input dataset while tagging copied records", async () => {
    const dataset = validDataset();
    const original = JSON.stringify(dataset);
    const client = new FakeClient(new FakeDatabase("app"));
    const { deps } = fakeDeps(client);

    await seedMongoDataset({
      connectionString,
      connectionTestToken: await successfulConnectionToken(),
      schema,
      dataset,
      targetDatabaseName: "app",
      confirmed: true
    }, deps);

    expect(JSON.stringify(dataset)).toBe(original);
  });

  it("reports partial failure and stops before later collection inserts", async () => {
    const database = new FakeDatabase("app", undefined, "orders");
    const client = new FakeClient(database);
    const { deps } = fakeDeps(client);

    const report = await seedMongoDataset({
      connectionString,
      connectionTestToken: await successfulConnectionToken(),
      schema,
      dataset: validDataset(),
      targetDatabaseName: "app",
      confirmed: true
    }, deps);

    expect(report.successfulCollections).toEqual([
      { collectionName: "users", requestedCount: 1, insertedCount: 1, status: "succeeded" }
    ]);
    expect(report.failedCollections).toEqual([
      {
        collectionName: "orders",
        requestedCount: 1,
        insertedCount: 0,
        status: "failed",
        errorSummary: "insert failed for [connection string redacted]"
      }
    ]);
    expect(report.insertedRecordCounts).toEqual({ users: 1 });
    expect(report.insertedDocumentIds).toEqual({ users: [userId] });
    expect(report.rollback.collections).toEqual([{ collectionName: "users", insertedCount: 1 }]);
    expect(client.closeCalls).toBe(1);
    expectNoConnectionString(report);
  });

  it("reports duplicate key bulk-write failures with partial inserted counts and rollback metadata", async () => {
    const newUserId = "64f000000000000000000003";
    const dataset = validDataset({
      collectionCounts: { users: 2, orders: 0 },
      generationOrder: ["users"],
      collections: {
        users: [
          { _id: userId, email: "existing@example.com", role: "member" },
          { _id: newUserId, email: "new@example.com", role: "admin" }
        ],
        orders: []
      }
    });
    const database = new FakeDatabase("app");
    database.collections.set(
      "users",
      new FakeCollection(
        new DirectMongoInsertManyError({
          message: "E11000 duplicate key error collection: app.users index: _id_ dup key",
          insertedCount: 1,
          insertedIds: [newUserId]
        })
      )
    );
    const client = new FakeClient(database);
    const { deps } = fakeDeps(client);

    const report = await seedMongoDataset({
      connectionString,
      connectionTestToken: await successfulConnectionToken(),
      schema,
      dataset,
      targetDatabaseName: "app",
      confirmed: true
    }, deps);

    expect(report.successfulCollections).toEqual([]);
    expect(report.failedCollections).toEqual([
      {
        collectionName: "users",
        requestedCount: 2,
        insertedCount: 1,
        status: "failed",
        errorSummary: "E11000 duplicate key error collection: app.users index: _id_ dup key"
      }
    ]);
    expect(report.insertedRecordCounts).toEqual({ users: 1 });
    expect(report.insertedDocumentIds).toEqual({ users: [newUserId] });
    expect(report.totalInsertedCount).toBe(1);
    expect(report.rollback.collections).toEqual([{ collectionName: "users", insertedCount: 1 }]);
    expectNoConnectionString(report);
  });
});
