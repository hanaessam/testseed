import type { SeedBatch } from "@testseed/types";
import {
  ApplySeedBatchVersionError,
  assertSeedBatchApplicable,
  finalizeSeedBatchApply,
  isActiveSeedBatch
} from "../apply-seed-batch-version";

const now = new Date("2026-06-10T12:00:00.000Z");

function seedBatch(overrides: Partial<SeedBatch> = {}): SeedBatch {
  return {
    id: "history-1",
    projectId: "project-1",
    actorId: "actor-1",
    seedBatchId: "11111111-1111-4111-8111-111111111111",
    collectionCounts: { users: 2 },
    insertedDocumentIds: { users: ["64f000000000000000000001", "64f000000000000000000002"] },
    collectionOrder: ["users"],
    status: "superseded",
    createdAt: now,
    savedDatasetId: "saved-1",
    ...overrides
  };
}

describe("isActiveSeedBatch", () => {
  it("treats inserted and partially_inserted as active", () => {
    expect(isActiveSeedBatch(seedBatch({ status: "inserted" }))).toBe(true);
    expect(isActiveSeedBatch(seedBatch({ status: "partially_inserted" }))).toBe(true);
    expect(isActiveSeedBatch(seedBatch({ status: "rolled_back" }))).toBe(false);
  });
});

describe("assertSeedBatchApplicable", () => {
  it("accepts any historical run with records", () => {
    expect(() => assertSeedBatchApplicable(seedBatch(), seedBatch().seedBatchId)).not.toThrow();
    expect(() =>
      assertSeedBatchApplicable(seedBatch({ status: "inserted" }), seedBatch().seedBatchId)
    ).not.toThrow();
    expect(() =>
      assertSeedBatchApplicable(seedBatch({ status: "rolled_back" }), seedBatch().seedBatchId)
    ).not.toThrow();
  });

  it("rejects batches without records", () => {
    expect(() =>
      assertSeedBatchApplicable(
        seedBatch({ collectionCounts: {}, insertedDocumentIds: {} }),
        seedBatch().seedBatchId
      )
    ).toThrow(ApplySeedBatchVersionError);
  });
});

describe("finalizeSeedBatchApply", () => {
  it("supersedes other active batches and activates the selected version", async () => {
    const target = seedBatch({ status: "superseded" });
    const active = seedBatch({
      id: "history-2",
      seedBatchId: "22222222-2222-4222-8222-222222222222",
      status: "inserted"
    });
    const supersedeCalls: string[] = [];

    const result = await finalizeSeedBatchApply(
      {
        projectId: "project-1",
        actorId: "actor-1",
        seedBatchId: target.seedBatchId
      },
      {
        now: () => now,
        findSeedBatchBySeedBatchId: async () => target,
        listSeedBatches: async () => [target, active],
        markSeedBatchSuperseded: async ({ seedBatchId }) => {
          supersedeCalls.push(seedBatchId);
          return seedBatch({ seedBatchId, status: "superseded" });
        },
        reactivateSeedBatch: async () => seedBatch({ status: "inserted" }),
        appendProjectEvent: async (input) => ({
          id: "event-1",
          projectId: input.projectId,
          actorId: input.actorId,
          kind: input.kind,
          message: input.message,
          payload: input.payload,
          createdAt: input.createdAt
        })
      }
    );

    expect(supersedeCalls).toEqual([active.seedBatchId]);
    expect(result.batch.status).toBe("inserted");
    expect(result.event.kind).toBe("seed_batch_applied");
    expect(result.supersededBatchIds).toEqual([active.seedBatchId]);
  });
});
