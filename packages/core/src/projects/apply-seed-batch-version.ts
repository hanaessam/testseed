import type { ProjectEvent, SeedBatch } from "@testseed/types";

export type ApplySeedBatchVersionErrorCode =
  | "APPLY_SEED_BATCH_ID_REQUIRED"
  | "APPLY_SEED_BATCH_ID_INVALID"
  | "APPLY_BATCH_NOT_FOUND"
  | "APPLY_BATCH_HAS_NO_RECORDS";

export interface ApplySeedBatchVersionErrorDetails {
  code: ApplySeedBatchVersionErrorCode;
  message: string;
}

export class ApplySeedBatchVersionError extends Error implements ApplySeedBatchVersionErrorDetails {
  code: ApplySeedBatchVersionErrorCode;

  constructor(details: ApplySeedBatchVersionErrorDetails) {
    super(details.message);
    this.name = "ApplySeedBatchVersionError";
    this.code = details.code;
  }
}

export interface FinalizeSeedBatchApplyRequest {
  projectId: string;
  actorId: string;
  seedBatchId: string;
}

export interface FinalizeSeedBatchApplyDeps {
  now?(): Date;
  findSeedBatchBySeedBatchId(projectId: string, seedBatchId: string): Promise<SeedBatch | null>;
  listSeedBatches(projectId: string): Promise<SeedBatch[]>;
  markSeedBatchSuperseded(input: {
    projectId: string;
    seedBatchId: string;
    supersededBySeedBatchId: string;
  }): Promise<SeedBatch | null>;
  reactivateSeedBatch(projectId: string, seedBatchId: string): Promise<SeedBatch | null>;
  appendProjectEvent(input: {
    projectId: string;
    actorId: string;
    kind: ProjectEvent["kind"];
    message: string;
    payload?: Record<string, unknown>;
    createdAt: Date;
  }): Promise<ProjectEvent>;
}

export interface FinalizeSeedBatchApplyResult {
  batch: SeedBatch;
  event: ProjectEvent;
  supersededBatchIds: string[];
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const prefixedBatchIdPattern = /^seed_[A-Za-z0-9_-]+$/;

export function isActiveSeedBatch(batch: SeedBatch): boolean {
  return batch.status === "inserted" || batch.status === "partially_inserted";
}

export function assertSeedBatchApplicable(
  batch: SeedBatch | null,
  seedBatchId: string
): asserts batch is SeedBatch {
  if (!batch) {
    throw new ApplySeedBatchVersionError({
      code: "APPLY_BATCH_NOT_FOUND",
      message: `Seed batch ${seedBatchId} was not found.`
    });
  }

  if (!hasRecordedInsertedRecords(batch)) {
    throw new ApplySeedBatchVersionError({
      code: "APPLY_BATCH_HAS_NO_RECORDS",
      message: `Seed batch ${seedBatchId} has no records to apply.`
    });
  }
}

export async function finalizeSeedBatchApply(
  request: FinalizeSeedBatchApplyRequest,
  deps: FinalizeSeedBatchApplyDeps
): Promise<FinalizeSeedBatchApplyResult> {
  const seedBatchId = normalizeSeedBatchId(request.seedBatchId);
  const batch = await deps.findSeedBatchBySeedBatchId(request.projectId, seedBatchId);
  assertSeedBatchApplicable(batch, seedBatchId);

  const activeBatches = (await deps.listSeedBatches(request.projectId)).filter(isActiveSeedBatch);
  const supersededBatchIds: string[] = [];

  for (const activeBatch of activeBatches) {
    if (activeBatch.seedBatchId === seedBatchId) {
      continue;
    }

    const superseded = await deps.markSeedBatchSuperseded({
      projectId: request.projectId,
      seedBatchId: activeBatch.seedBatchId,
      supersededBySeedBatchId: seedBatchId
    });
    if (superseded) {
      supersededBatchIds.push(superseded.seedBatchId);
    }
  }

  const applied = await deps.reactivateSeedBatch(request.projectId, seedBatchId);
  if (!applied) {
    throw new ApplySeedBatchVersionError({
      code: "APPLY_BATCH_NOT_FOUND",
      message: `Seed batch ${seedBatchId} was not found.`
    });
  }

  const now = deps.now?.() ?? new Date();
  const event = await deps.appendProjectEvent({
    projectId: request.projectId,
    actorId: request.actorId,
    kind: "seed_batch_applied",
    message: "Applied seed batch version in MongoDB",
    payload: {
      seedBatchId,
      supersededBatchIds
    },
    createdAt: now
  });

  return {
    batch: applied,
    event,
    supersededBatchIds
  };
}

function normalizeSeedBatchId(seedBatchId: string): string {
  const trimmed = seedBatchId.trim();
  if (!trimmed) {
    throw new ApplySeedBatchVersionError({
      code: "APPLY_SEED_BATCH_ID_REQUIRED",
      message: "seedBatchId is required."
    });
  }

  if (!uuidPattern.test(trimmed) && !prefixedBatchIdPattern.test(trimmed)) {
    throw new ApplySeedBatchVersionError({
      code: "APPLY_SEED_BATCH_ID_INVALID",
      message: "seedBatchId is invalid."
    });
  }

  return trimmed;
}

function hasRecordedInsertedRecords(batch: SeedBatch): boolean {
  const insertedFromIds = Object.values(batch.insertedDocumentIds ?? {}).some((ids) => ids.length > 0);
  const insertedFromCounts = Object.values(batch.collectionCounts ?? {}).some((count) => count > 0);
  return insertedFromIds || insertedFromCounts;
}
