import type { SeedBatch } from "@testseed/types";

export function isActiveSeedBatch(batch: SeedBatch): boolean {
  return batch.status === "inserted" || batch.status === "partially_inserted";
}

export function canApplySeedBatchVersion(batch: SeedBatch): boolean {
  if (batch.status === "pending") {
    return false;
  }

  return hasSeedBatchRecords(batch);
}

export function findActiveSeedBatch(batches: SeedBatch[]): SeedBatch | null {
  const active = batches.filter(isActiveSeedBatch);
  if (active.length === 0) {
    return null;
  }

  return active[active.length - 1] ?? null;
}

export function formatSeedBatchStatus(batch: SeedBatch, activeBatch: SeedBatch | null): string {
  if (activeBatch?.seedBatchId === batch.seedBatchId) {
    return "Active in MongoDB";
  }

  switch (batch.status) {
    case "inserted":
    case "partially_inserted":
    case "rolled_back":
    case "superseded":
      return "Previous run";
    case "pending":
      return "Pending";
    default:
      return batch.status;
  }
}

function hasSeedBatchRecords(batch: SeedBatch): boolean {
  const insertedFromIds = Object.values(batch.insertedDocumentIds ?? {}).some((ids) => ids.length > 0);
  const insertedFromCounts = Object.values(batch.collectionCounts ?? {}).some((count) => count > 0);
  return insertedFromIds || insertedFromCounts;
}

export function totalSeedBatchRecords(batch: SeedBatch): number {
  const fromCounts = Object.values(batch.collectionCounts ?? {}).reduce((sum, count) => sum + count, 0);
  if (fromCounts > 0) {
    return fromCounts;
  }

  return Object.values(batch.insertedDocumentIds ?? {}).reduce((sum, ids) => sum + ids.length, 0);
}
