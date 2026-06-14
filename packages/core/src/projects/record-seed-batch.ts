import type { ProjectEvent, SeedBatch } from "@testseed/types";

export interface RecordSeedBatchRequest {
  projectId: string;
  actorId: string;
  seedBatchId: string;
  collectionCounts: Record<string, number>;
  insertedDocumentIds: Record<string, string[]>;
  collectionOrder: string[];
  status: SeedBatch["status"];
  savedDatasetId?: string;
  targetDatabaseName?: string;
}

export interface RecordSeedBatchRecordInput {
  projectId: string;
  actorId: string;
  seedBatchId: string;
  collectionCounts: Record<string, number>;
  insertedDocumentIds: Record<string, string[]>;
  collectionOrder: string[];
  status: SeedBatch["status"];
  createdAt: Date;
  rolledBackAt?: Date;
  rollbackDeletedCounts?: Record<string, number>;
  savedDatasetId?: string;
  targetDatabaseName?: string;
}

export interface RecordSeedBatchDeps {
  now?(): Date;
  recordSeedBatchRecord(input: RecordSeedBatchRecordInput): Promise<SeedBatch>;
  appendProjectEvent(input: {
    projectId: string;
    actorId: string;
    kind: ProjectEvent["kind"];
    message: string;
    payload?: Record<string, unknown>;
    createdAt: Date;
  }): Promise<ProjectEvent>;
}

export async function recordSeedBatch(
  request: RecordSeedBatchRequest,
  deps: RecordSeedBatchDeps
): Promise<{ batch: SeedBatch; event: ProjectEvent }> {
  const now = deps.now?.() ?? new Date();
  const batch = await deps.recordSeedBatchRecord({
    projectId: request.projectId,
    actorId: request.actorId,
    seedBatchId: request.seedBatchId,
    collectionCounts: request.collectionCounts,
    insertedDocumentIds: request.insertedDocumentIds,
    collectionOrder: request.collectionOrder,
    status: request.status,
    createdAt: now,
    savedDatasetId: request.savedDatasetId,
    targetDatabaseName: request.targetDatabaseName
  });

  const event = await deps.appendProjectEvent({
    projectId: request.projectId,
    actorId: request.actorId,
    kind: "seed_batch_recorded",
    message: "Recorded seed batch",
    payload: {
      seedBatchId: request.seedBatchId,
      status: request.status,
      collectionCounts: request.collectionCounts
    },
    createdAt: now
  });

  return { batch, event };
}
