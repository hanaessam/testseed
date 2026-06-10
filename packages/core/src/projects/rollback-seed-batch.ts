import type {
  ProjectEvent,
  RollbackSeedBatchErrorCode,
  RollbackSeedBatchErrorDetails,
  RollbackSeedBatchReport,
  SeedBatch
} from "@testseed/types";

export interface RollbackSeedBatchRequest {
  projectId: string;
  actorId: string;
  seedBatchId: string;
}

export interface RollbackSeedBatchDeps {
  now?(): Date;
  findSeedBatchBySeedBatchId(projectId: string, seedBatchId: string): Promise<SeedBatch | null>;
  deleteRecordsBySeedBatchId(input: {
    collectionName: string;
    seedBatchId: string;
  }): Promise<{ deletedCount: number }>;
  markSeedBatchRolledBack(input: {
    projectId: string;
    seedBatchId: string;
    rolledBackAt: Date;
    rollbackDeletedCounts: Record<string, number>;
  }): Promise<SeedBatch | null>;
  appendProjectEvent(input: {
    projectId: string;
    actorId: string;
    kind: ProjectEvent["kind"];
    message: string;
    payload?: Record<string, unknown>;
    createdAt: Date;
  }): Promise<ProjectEvent>;
}

export interface RollbackSeedBatchSuccess {
  batch: SeedBatch;
  report: RollbackSeedBatchReport & { status: "rolled_back"; rolledBackAt: Date };
  event: ProjectEvent;
}

export interface RollbackSeedBatchPartialFailure {
  batch: SeedBatch;
  report: RollbackSeedBatchReport & { status: "partial_failure" };
}

export type RollbackSeedBatchResult = RollbackSeedBatchSuccess | RollbackSeedBatchPartialFailure;

export class RollbackSeedBatchError extends Error implements RollbackSeedBatchErrorDetails {
  code: RollbackSeedBatchErrorCode;

  constructor(details: RollbackSeedBatchErrorDetails) {
    super(details.message);
    this.name = "RollbackSeedBatchError";
    this.code = details.code;
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const prefixedBatchIdPattern = /^seed_[A-Za-z0-9_-]+$/;

export async function rollbackSeedBatch(
  request: RollbackSeedBatchRequest,
  deps: RollbackSeedBatchDeps
): Promise<RollbackSeedBatchResult> {
  const seedBatchId = normalizeSeedBatchId(request.seedBatchId);
  const batch = await deps.findSeedBatchBySeedBatchId(request.projectId, seedBatchId);

  assertEligibleBatch(batch, seedBatchId);

  const rollbackOrder = resolveRollbackOrder(batch);
  const completedCollections: Array<{ collectionName: string; status: "deleted"; deletedCount: number }> = [];
  const deletedCounts: Record<string, number> = {};

  for (const collectionName of rollbackOrder) {
    try {
      const result = await deps.deleteRecordsBySeedBatchId({ collectionName, seedBatchId });
      const deletedCount = result.deletedCount;
      deletedCounts[collectionName] = deletedCount;
      completedCollections.push({
        collectionName,
        status: "deleted",
        deletedCount
      });
    } catch {
      return {
        batch,
        report: {
          seedBatchId,
          status: "partial_failure",
          deletedCounts,
          completedCollections,
          failedCollection: {
            collectionName,
            status: "failed",
            error: "Collection deletion failed"
          },
          processedOrder: rollbackOrder
        }
      };
    }
  }

  const rolledBackAt = deps.now?.() ?? new Date();
  const rolledBackBatch = await deps.markSeedBatchRolledBack({
    projectId: request.projectId,
    seedBatchId,
    rolledBackAt,
    rollbackDeletedCounts: deletedCounts
  });

  if (!rolledBackBatch) {
    throw new RollbackSeedBatchError({
      code: "ROLLBACK_BATCH_NOT_FOUND",
      message: `Seed batch ${seedBatchId} was not found.`
    });
  }

  const report: RollbackSeedBatchSuccess["report"] = {
    seedBatchId,
    status: "rolled_back",
    deletedCounts,
    completedCollections,
    processedOrder: rollbackOrder,
    rolledBackAt
  };

  const event = await deps.appendProjectEvent({
    projectId: request.projectId,
    actorId: request.actorId,
    kind: "rollback_completed",
    message: "Rolled back seed batch",
    payload: {
      seedBatchId,
      deletedCounts,
      processedOrder: rollbackOrder
    },
    createdAt: rolledBackAt
  });

  return {
    batch: rolledBackBatch,
    report,
    event
  };
}

function normalizeSeedBatchId(seedBatchId: string): string {
  const trimmed = seedBatchId.trim();
  if (!trimmed) {
    throw new RollbackSeedBatchError({
      code: "ROLLBACK_SEED_BATCH_ID_REQUIRED",
      message: "seedBatchId is required."
    });
  }

  if (!uuidPattern.test(trimmed) && !prefixedBatchIdPattern.test(trimmed)) {
    throw new RollbackSeedBatchError({
      code: "ROLLBACK_SEED_BATCH_ID_INVALID",
      message: "seedBatchId is invalid."
    });
  }

  return trimmed;
}

function assertEligibleBatch(batch: SeedBatch | null, seedBatchId: string): asserts batch is SeedBatch {
  if (!batch) {
    throw new RollbackSeedBatchError({
      code: "ROLLBACK_BATCH_NOT_FOUND",
      message: `Seed batch ${seedBatchId} was not found.`
    });
  }

  if (batch.status === "rolled_back") {
    throw new RollbackSeedBatchError({
      code: "ROLLBACK_BATCH_ALREADY_ROLLED_BACK",
      message: `Seed batch ${seedBatchId} was already rolled back.`
    });
  }

  if (batch.status === "pending" || !hasRecordedInsertedRecords(batch)) {
    throw new RollbackSeedBatchError({
      code: "ROLLBACK_BATCH_HAS_NO_RECORDS",
      message: `Seed batch ${seedBatchId} has no records to roll back.`
    });
  }
}

function hasRecordedInsertedRecords(batch: SeedBatch): boolean {
  return Object.values(batch.insertedDocumentIds).some((ids) => ids.length > 0);
}

function resolveRollbackOrder(batch: SeedBatch): string[] {
  const collectionsWithRecords = new Set(
    Object.entries(batch.insertedDocumentIds)
      .filter(([, ids]) => ids.length > 0)
      .map(([collectionName]) => collectionName)
  );
  const ordered = batch.collectionOrder.filter((collectionName) => collectionsWithRecords.has(collectionName));
  const missing = [...collectionsWithRecords].filter((collectionName) => !ordered.includes(collectionName));
  return [...ordered, ...missing].reverse();
}
