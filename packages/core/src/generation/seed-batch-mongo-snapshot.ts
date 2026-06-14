import type { GeneratedDataset, GeneratedRecord, SeedBatch } from "@testseed/types";
import type { DirectMongoClientFactory } from "./direct-mongodb-seeding";

const defaultTimeoutMs = 7000;

export interface SnapshotSeedBatchFromMongoInput {
  connectionString: string;
  targetDatabaseName: string;
  projectId: string;
  schemaSnapshotId: string;
  batch: SeedBatch;
}

export interface PurgeSeedBatchFromMongoInput {
  connectionString: string;
  targetDatabaseName: string;
  seedBatchId: string;
  collectionNames: string[];
}

export async function snapshotSeedBatchFromMongo(
  input: SnapshotSeedBatchFromMongoInput,
  deps: { clientFactory: DirectMongoClientFactory; timeoutMs?: number }
): Promise<GeneratedDataset | null> {
  const timeoutMs = deps.timeoutMs ?? defaultTimeoutMs;
  const collectionNames = resolveSnapshotCollectionNames(input.batch);
  if (collectionNames.length === 0) {
    return null;
  }

  const collections: Record<string, GeneratedRecord[]> = {};
  let client;

  try {
    client = deps.clientFactory.create(input.connectionString, { timeoutMs });
    await client.connect();
    const db = client.db(input.targetDatabaseName);

    for (const collectionName of collectionNames) {
      const collection = db.collection(collectionName);
      const ids = input.batch.insertedDocumentIds?.[collectionName] ?? [];
      const documents =
        ids.length > 0
          ? await collection.findByIds(ids)
          : await collection.findBySeedBatchId(input.batch.seedBatchId);

      if (documents.length === 0) {
        continue;
      }

      collections[collectionName] = documents.map(stripSeedBatchTag);
    }
  } finally {
    if (client) {
      await client.close();
    }
  }

  const generationOrder = input.batch.collectionOrder.filter((collectionName) => collections[collectionName]?.length);
  if (generationOrder.length === 0) {
    return null;
  }

  const collectionCounts = Object.fromEntries(
    generationOrder.map((collectionName) => [collectionName, collections[collectionName]?.length ?? 0])
  );

  return {
    projectId: input.projectId,
    schemaSnapshotId: input.schemaSnapshotId,
    status: "valid",
    generationOrder,
    collectionCounts,
    collections,
    validationResults: [],
    warnings: [],
    createdAt: input.batch.createdAt.toISOString()
  };
}

export async function purgeSeedBatchFromMongo(
  input: PurgeSeedBatchFromMongoInput,
  deps: { clientFactory: DirectMongoClientFactory; timeoutMs?: number }
): Promise<Record<string, number>> {
  const timeoutMs = deps.timeoutMs ?? defaultTimeoutMs;
  const deletedCounts: Record<string, number> = {};
  let client;

  try {
    client = deps.clientFactory.create(input.connectionString, { timeoutMs });
    await client.connect();
    const db = client.db(input.targetDatabaseName);

    for (const collectionName of input.collectionNames) {
      const result = await db.collection(collectionName).deleteMany({ seedBatchId: input.seedBatchId });
      deletedCounts[collectionName] = result.deletedCount;
    }
  } finally {
    if (client) {
      await client.close();
    }
  }

  return deletedCounts;
}

function resolveSnapshotCollectionNames(batch: SeedBatch): string[] {
  const names = new Set<string>(batch.collectionOrder ?? []);

  for (const collectionName of Object.keys(batch.insertedDocumentIds ?? {})) {
    names.add(collectionName);
  }

  for (const collectionName of Object.keys(batch.collectionCounts ?? {})) {
    names.add(collectionName);
  }

  return [...names];
}

function stripSeedBatchTag(document: Record<string, unknown>): GeneratedRecord {
  const { seedBatchId: _seedBatchId, ...rest } = document;
  return {
    ...rest,
    _id: String(rest._id)
  } as GeneratedRecord;
}
