import type { ProjectEvent, SeedBatch } from "@testseed/types";
import {
  RollbackSeedBatchError,
  rollbackSeedBatch,
  type RollbackSeedBatchDeps
} from "../rollback-seed-batch";

const now = new Date("2026-06-09T12:00:00.000Z");
const seedBatchId = "11111111-1111-4111-8111-111111111111";

function seedBatch(overrides: Partial<SeedBatch> = {}): SeedBatch {
  return {
    id: "batch-row-1",
    projectId: "project-1",
    actorId: "user-1",
    seedBatchId,
    collectionCounts: { users: 1, orders: 2 },
    insertedDocumentIds: {
      users: ["user-1"],
      orders: ["order-1", "order-2"]
    },
    collectionOrder: ["users", "orders"],
    status: "inserted",
    createdAt: new Date("2026-06-09T11:00:00.000Z"),
    ...overrides
  };
}

function depsFor(batch: SeedBatch | null): {
  deps: RollbackSeedBatchDeps;
  deleteCalls: Array<{ collectionName: string; seedBatchId: string }>;
  markCalls: Array<{
    projectId: string;
    seedBatchId: string;
    rolledBackAt: Date;
    rollbackDeletedCounts: Record<string, number>;
  }>;
  events: ProjectEvent[];
} {
  const deleteCalls: Array<{ collectionName: string; seedBatchId: string }> = [];
  const markCalls: Array<{
    projectId: string;
    seedBatchId: string;
    rolledBackAt: Date;
    rollbackDeletedCounts: Record<string, number>;
  }> = [];
  const events: ProjectEvent[] = [];

  return {
    deleteCalls,
    markCalls,
    events,
    deps: {
      now: () => now,
      findSeedBatchBySeedBatchId: async () => batch,
      deleteRecordsBySeedBatchId: async (input) => {
        deleteCalls.push(input);
        return { deletedCount: input.collectionName === "orders" ? 2 : 1 };
      },
      markSeedBatchRolledBack: async (input) => {
        markCalls.push(input);
        return batch
          ? {
              ...batch,
              status: "rolled_back",
              rolledBackAt: input.rolledBackAt,
              rollbackDeletedCounts: input.rollbackDeletedCounts
            }
          : null;
      },
      appendProjectEvent: async (input) => {
        const event = { id: "event-1", ...input };
        events.push(event);
        return event;
      }
    }
  };
}

function request(seedBatchIdOverride = seedBatchId) {
  return {
    projectId: "project-1",
    actorId: "user-1",
    seedBatchId: seedBatchIdOverride
  };
}

function expectRollbackError(error: unknown, code: string): void {
  expect(error).toBeInstanceOf(RollbackSeedBatchError);
  expect(error).toMatchObject({ code });
}

describe("rollbackSeedBatch", () => {
  it("deletes tagged records and returns a structured report", async () => {
    const { deps, deleteCalls, markCalls, events } = depsFor(seedBatch());

    const result = await rollbackSeedBatch(request(), deps);

    expect(deleteCalls).toEqual([
      { collectionName: "orders", seedBatchId },
      { collectionName: "users", seedBatchId }
    ]);
    expect(result.report).toEqual({
      seedBatchId,
      status: "rolled_back",
      deletedCounts: { orders: 2, users: 1 },
      completedCollections: [
        { collectionName: "orders", status: "deleted", deletedCount: 2 },
        { collectionName: "users", status: "deleted", deletedCount: 1 }
      ],
      processedOrder: ["orders", "users"],
      rolledBackAt: now
    });
    expect(markCalls).toEqual([
      {
        projectId: "project-1",
        seedBatchId,
        rolledBackAt: now,
        rollbackDeletedCounts: { orders: 2, users: 1 }
      }
    ]);
    expect(result.batch.status).toBe("rolled_back");
    expect(events[0]).toMatchObject({
      kind: "rollback_completed",
      payload: {
        seedBatchId,
        deletedCounts: { orders: 2, users: 1 },
        processedOrder: ["orders", "users"]
      }
    });
  });

  it("passes collectionName and seedBatchId to the deletion dependency instead of document ids", async () => {
    const { deps, deleteCalls } = depsFor(seedBatch());

    await rollbackSeedBatch(request(), deps);

    expect(deleteCalls).toEqual([
      { collectionName: "orders", seedBatchId },
      { collectionName: "users", seedBatchId }
    ]);
  });

  it("uses the reverse of stored collectionOrder and reports processed order", async () => {
    const { deps, deleteCalls } = depsFor(
      seedBatch({
        collectionOrder: ["users", "orders", "orderItems"],
        collectionCounts: { users: 1, orders: 1, orderItems: 3 },
        insertedDocumentIds: {
          users: ["user-1"],
          orders: ["order-1"],
          orderItems: ["item-1", "item-2", "item-3"]
        }
      })
    );

    const result = await rollbackSeedBatch(request(), deps);

    expect(deleteCalls.map((call) => call.collectionName)).toEqual(["orderItems", "orders", "users"]);
    expect(result.report.processedOrder).toEqual(["orderItems", "orders", "users"]);
  });

  it("returns a partial-failure report and does not mark the batch rolled back", async () => {
    const batch = seedBatch();
    const { deps, deleteCalls, markCalls, events } = depsFor(batch);
    deps.deleteRecordsBySeedBatchId = async (input) => {
      deleteCalls.push(input);
      if (input.collectionName === "users") {
        throw new Error("delete failed for mongodb://user:secret@example.test/db");
      }
      return { deletedCount: 2 };
    };

    const result = await rollbackSeedBatch(request(), deps);

    expect(result.report).toEqual({
      seedBatchId,
      status: "partial_failure",
      deletedCounts: { orders: 2 },
      completedCollections: [{ collectionName: "orders", status: "deleted", deletedCount: 2 }],
      failedCollection: {
        collectionName: "users",
        status: "failed",
        error: "Collection deletion failed"
      },
      processedOrder: ["orders", "users"]
    });
    expect(markCalls).toEqual([]);
    expect(events).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("mongodb://");
  });

  it.each([
    ["", "ROLLBACK_SEED_BATCH_ID_REQUIRED"],
    ["   ", "ROLLBACK_SEED_BATCH_ID_REQUIRED"],
    ["not a batch id", "ROLLBACK_SEED_BATCH_ID_INVALID"]
  ])("rejects invalid seedBatchId %p before deletion", async (input, code) => {
    const { deps, deleteCalls } = depsFor(seedBatch());

    await rollbackSeedBatch(request(input), deps).catch((error) => expectRollbackError(error, code));

    expect(deleteCalls).toEqual([]);
  });

  it("rejects unknown seed batch before deletion", async () => {
    const { deps, deleteCalls } = depsFor(null);

    await rollbackSeedBatch(request(), deps).catch((error) =>
      expectRollbackError(error, "ROLLBACK_BATCH_NOT_FOUND")
    );

    expect(deleteCalls).toEqual([]);
  });

  it("rejects already rolled back seed batch before deletion", async () => {
    const { deps, deleteCalls } = depsFor(seedBatch({ status: "rolled_back", rolledBackAt: now }));

    await rollbackSeedBatch(request(), deps).catch((error) =>
      expectRollbackError(error, "ROLLBACK_BATCH_ALREADY_ROLLED_BACK")
    );

    expect(deleteCalls).toEqual([]);
  });

  it("rolls back using collectionCounts when insertedDocumentIds are missing", async () => {
    const { deps, deleteCalls } = depsFor(
      seedBatch({
        collectionCounts: {
          subcategories: 3,
          users: 5,
          brands: 3,
          categories: 3,
          orders: 10,
          products: 5
        },
        insertedDocumentIds: {},
        collectionOrder: ["subcategories", "users", "brands", "categories", "orders", "products"]
      })
    );

    const result = await rollbackSeedBatch(request(), deps);

    expect(deleteCalls.map((call) => call.collectionName)).toEqual([
      "products",
      "orders",
      "categories",
      "brands",
      "users",
      "subcategories"
    ]);
    expect(result.report.processedOrder).toEqual([
      "products",
      "orders",
      "categories",
      "brands",
      "users",
      "subcategories"
    ]);
  });

  it("deletes tagged records from discovered collections not listed on the batch", async () => {
    const batch = seedBatch({
      collectionOrder: ["users", "orders"],
      collectionCounts: { users: 1, orders: 1 },
      insertedDocumentIds: { users: ["user-1"], orders: ["order-1"] }
    });
    const { deps, deleteCalls } = depsFor(batch);
    deps.listTargetCollectionNames = async () => ["users", "orders", "audit_logs"];

    const result = await rollbackSeedBatch(request(), deps);

    expect(deleteCalls.map((call) => call.collectionName)).toEqual(["orders", "users", "audit_logs"]);
    expect(result.report.status).toBe("rolled_back");
  });

  it("rejects pending or no-record seed batches before deletion", async () => {
    const pending = depsFor(seedBatch({ status: "pending" }));
    await rollbackSeedBatch(request(), pending.deps).catch((error) =>
      expectRollbackError(error, "ROLLBACK_BATCH_HAS_NO_RECORDS")
    );
    expect(pending.deleteCalls).toEqual([]);

    const empty = depsFor(seedBatch({ collectionCounts: { users: 0 }, insertedDocumentIds: { users: [] } }));
    await rollbackSeedBatch(request(), empty.deps).catch((error) =>
      expectRollbackError(error, "ROLLBACK_BATCH_HAS_NO_RECORDS")
    );
    expect(empty.deleteCalls).toEqual([]);
  });
});
