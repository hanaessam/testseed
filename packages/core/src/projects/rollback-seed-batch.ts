import type { ProjectEvent, SeedBatch } from "@testseed/types";

export interface RollbackSeedBatchRequest {
  projectId: string;
  actorId: string;
  seedBatchId: string;
}

export interface RollbackSeedBatchDeps {
  now?(): Date;
  findSeedBatchBySeedBatchId(projectId: string, seedBatchId: string): Promise<SeedBatch | null>;
  deleteRecordsByIds(collectionToIds: Record<string, string[]>): Promise<Record<string, number>>;
  markSeedBatchRolledBack(
    projectId: string,
    seedBatchId: string,
    rolledBackAt: Date
  ): Promise<SeedBatch | null>;
  appendProjectEvent(input: {
    projectId: string;
    actorId: string;
    kind: ProjectEvent["kind"];
    message: string;
    payload?: Record<string, unknown>;
    createdAt: Date;
  }): Promise<ProjectEvent>;
}

export async function rollbackSeedBatch(
  request: RollbackSeedBatchRequest,
  deps: RollbackSeedBatchDeps
): Promise<{ batch: SeedBatch; deletedCounts: Record<string, number>; event: ProjectEvent }> {
  const batch = await deps.findSeedBatchBySeedBatchId(request.projectId, request.seedBatchId);
  if (!batch) {
    throw new Error(`Seed batch ${request.seedBatchId} was not found`);
  }

  const now = deps.now?.() ?? new Date();
  const deletedCounts = await deps.deleteRecordsByIds(batch.insertedDocumentIds);
  const rolledBackBatch = await deps.markSeedBatchRolledBack(
    request.projectId,
    request.seedBatchId,
    now
  );

  if (!rolledBackBatch) {
    throw new Error(`Seed batch ${request.seedBatchId} was not found`);
  }

  const event = await deps.appendProjectEvent({
    projectId: request.projectId,
    actorId: request.actorId,
    kind: "rollback_completed",
    message: "Rolled back seed batch",
    payload: {
      seedBatchId: request.seedBatchId,
      deletedCounts
    },
    createdAt: now
  });

  return {
    batch: rolledBackBatch,
    deletedCounts,
    event
  };
}
