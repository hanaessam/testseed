import { createHash, randomUUID } from "crypto";
import type {
  DirectMongoConnectionTestRequest,
  DirectMongoConnectionTestResult,
  DirectMongoSeedingErrorCode,
  DirectMongoSeedingErrorDetails,
  DirectSeedingConfirmationRequest,
  DirectSeedingConfirmationSummary,
  DirectSeedingReport,
  DirectSeedingRequest,
  GeneratedDataset,
  GeneratedRecord,
  GenerationValidationResult,
  InsertedCollectionResult
} from "@testseed/types";
import { validateGeneratedDataset } from "./validate-generated-dataset";

export const DIRECT_SEEDING_CONFIRMATION_WARNING =
  "Records will be inserted into the target database. Insertion is irreversible without rollback.";

const defaultTimeoutMs = 7000;
const minTimeoutMs = 5000;
const maxTimeoutMs = 10000;
const connectionTokenPrefix = "direct-seed-v1";

export interface DirectMongoClientFactory {
  create(connectionString: string, options: { timeoutMs: number }): DirectMongoClient;
}

export interface DirectMongoClient {
  connect(): Promise<void>;
  db(databaseName?: string): DirectMongoDatabase;
  close(): Promise<void>;
}

export interface DirectMongoDatabase {
  databaseName: string;
  command(command: { ping: 1 }): Promise<unknown>;
  collection(name: string): DirectMongoCollection;
}

export interface DirectMongoCollection {
  insertMany(records: Record<string, unknown>[]): Promise<{ insertedCount: number }>;
}

export interface DirectMongoSeedingDeps {
  clientFactory: DirectMongoClientFactory;
  generateSeedBatchId?: () => string;
  createConnectionFingerprint?: (connectionString: string) => string;
  defaultTimeoutMs?: number;
}

export class DirectMongoSeedingError extends Error implements DirectMongoSeedingErrorDetails {
  code: DirectMongoSeedingErrorCode;
  validationResults?: GenerationValidationResult[];

  constructor(details: DirectMongoSeedingErrorDetails) {
    super(details.message);
    this.name = "DirectMongoSeedingError";
    this.code = details.code;
    this.validationResults = details.validationResults;
  }
}

export async function testDirectMongoConnection(
  request: DirectMongoConnectionTestRequest,
  deps: DirectMongoSeedingDeps
): Promise<DirectMongoConnectionTestResult> {
  const connectionString = requireConnectionString(request.connectionString);
  const timeoutMs = normalizeTimeoutMs(request.timeoutMs ?? deps.defaultTimeoutMs);
  const fingerprint = createConnectionFingerprint(connectionString, deps);
  let client: DirectMongoClient | undefined;

  try {
    client = deps.clientFactory.create(connectionString, { timeoutMs });
    await client.connect();
    const db = client.db();
    await db.command({ ping: 1 });

    return {
      ok: true,
      databaseName: db.databaseName,
      connectionFingerprint: fingerprint,
      connectionTestToken: buildConnectionTestToken(fingerprint),
      message: "Connection successful."
    };
  } catch (error) {
    return {
      ok: false,
      message: "Connection failed.",
      errorSummary: sanitizeErrorSummary(error, connectionString)
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

export function buildDirectSeedingConfirmation(
  request: DirectSeedingConfirmationRequest
): DirectSeedingConfirmationSummary {
  const orderedCollections = resolveOrderedCollections(request.dataset);
  const collectionCounts = Object.fromEntries(
    orderedCollections.map((collectionName) => [
      collectionName,
      request.dataset.collections[collectionName]?.length ?? 0
    ])
  );
  const totalRecordCount = Object.values(collectionCounts).reduce((sum, count) => sum + count, 0);

  return {
    targetDatabaseName: request.targetDatabaseName,
    orderedCollections,
    collectionCounts,
    totalRecordCount,
    warning: DIRECT_SEEDING_CONFIRMATION_WARNING
  };
}

export async function seedMongoDataset(
  request: DirectSeedingRequest,
  deps: DirectMongoSeedingDeps
): Promise<DirectSeedingReport> {
  const connectionString = requireConnectionString(request.connectionString);
  assertConfirmed(request.confirmed);
  assertConnectionTestToken(connectionString, request.connectionTestToken, deps);

  const orderedCollections = resolveOrderedCollections(request.dataset);
  const validation = validateGeneratedDataset({
    schema: request.schema,
    dataset: request.dataset,
    collectionCounts: request.dataset.collectionCounts
  });
  const blockingResults = validation.validationResults.filter((result) => result.severity === "error");
  if (blockingResults.length > 0) {
    throw new DirectMongoSeedingError({
      code: "DIRECT_SEED_VALIDATION_FAILED",
      message: "Cannot seed MongoDB until validation errors are fixed.",
      validationResults: blockingResults
    });
  }

  const timeoutMs = normalizeTimeoutMs(request.timeoutMs ?? deps.defaultTimeoutMs);
  const seedBatchId = (deps.generateSeedBatchId ?? randomUUID)();
  const successfulCollections: InsertedCollectionResult[] = [];
  const failedCollections: InsertedCollectionResult[] = [];
  const insertedRecordCounts: Record<string, number> = {};
  let client: DirectMongoClient | undefined;

  try {
    client = deps.clientFactory.create(connectionString, { timeoutMs });
    await client.connect();
    const db = client.db(request.targetDatabaseName);

    for (const collectionName of orderedCollections) {
      const sourceRecords = request.dataset.collections[collectionName] ?? [];
      const records = sourceRecords.map((record) => tagRecord(record, seedBatchId));

      try {
        const result = await db.collection(collectionName).insertMany(records);
        const insertedCount = result.insertedCount;
        insertedRecordCounts[collectionName] = insertedCount;
        successfulCollections.push({
          collectionName,
          requestedCount: records.length,
          insertedCount,
          status: "succeeded"
        });
      } catch (error) {
        failedCollections.push({
          collectionName,
          requestedCount: records.length,
          insertedCount: 0,
          status: "failed",
          errorSummary: sanitizeErrorSummary(error, connectionString)
        });
        break;
      }
    }
  } finally {
    if (client) {
      await client.close();
    }
  }

  return {
    seedBatchId,
    targetDatabaseName: request.targetDatabaseName,
    successfulCollections,
    failedCollections,
    insertedRecordCounts,
    totalInsertedCount: Object.values(insertedRecordCounts).reduce((sum, count) => sum + count, 0),
    rollback: {
      seedBatchId,
      collections: successfulCollections.map((collection) => ({
        collectionName: collection.collectionName,
        insertedCount: collection.insertedCount
      }))
    }
  };
}

export function createDirectMongoConnectionFingerprint(connectionString: string): string {
  return createHash("sha256").update(connectionString).digest("hex");
}

function assertConfirmed(confirmed: boolean): void {
  if (!confirmed) {
    throw new DirectMongoSeedingError({
      code: "DIRECT_SEED_CONFIRMATION_REQUIRED",
      message: "Direct seeding requires explicit confirmation before insertion begins."
    });
  }
}

function assertConnectionTestToken(
  connectionString: string,
  token: string | undefined,
  deps: DirectMongoSeedingDeps
): void {
  const expected = buildConnectionTestToken(createConnectionFingerprint(connectionString, deps));
  if (!token || token !== expected) {
    throw new DirectMongoSeedingError({
      code: "DIRECT_SEED_CONNECTION_TEST_REQUIRED",
      message: "Direct seeding requires a successful connection test for the active connection string."
    });
  }
}

function buildConnectionTestToken(fingerprint: string): string {
  return `${connectionTokenPrefix}.${fingerprint}`;
}

function createConnectionFingerprint(connectionString: string, deps: DirectMongoSeedingDeps): string {
  return (deps.createConnectionFingerprint ?? createDirectMongoConnectionFingerprint)(connectionString);
}

function requireConnectionString(connectionString: string | undefined): string {
  const trimmed = connectionString?.trim();
  if (!trimmed) {
    throw new DirectMongoSeedingError({
      code: "DIRECT_SEED_CONNECTION_STRING_REQUIRED",
      message: "MongoDB connection string is required."
    });
  }
  return trimmed;
}

function normalizeTimeoutMs(timeoutMs: number | undefined): number {
  if (!timeoutMs || !Number.isFinite(timeoutMs)) {
    return defaultTimeoutMs;
  }
  return Math.min(Math.max(Math.trunc(timeoutMs), minTimeoutMs), maxTimeoutMs);
}

function resolveOrderedCollections(dataset: GeneratedDataset): string[] {
  const nonEmptyCollections = Object.keys(dataset.collections).filter(
    (collectionName) => (dataset.collections[collectionName] ?? []).length > 0
  );
  if (nonEmptyCollections.length === 0) {
    throw new DirectMongoSeedingError({
      code: "DIRECT_SEED_DATASET_EMPTY",
      message: "Cannot seed MongoDB because the dataset contains no records."
    });
  }

  const generationOrder = dataset.generationOrder.filter(
    (collectionName) => (dataset.collections[collectionName] ?? []).length > 0
  );
  const orderedSet = new Set(generationOrder);
  const missingCollections = nonEmptyCollections.filter((collectionName) => !orderedSet.has(collectionName));
  if (missingCollections.length > 0) {
    throw new DirectMongoSeedingError({
      code: "DIRECT_SEED_GENERATION_ORDER_UNSAFE",
      message: `Cannot seed MongoDB because generationOrder is missing: ${missingCollections.join(", ")}.`
    });
  }

  return generationOrder;
}

function tagRecord(record: GeneratedRecord, seedBatchId: string): Record<string, unknown> {
  return {
    ...record,
    seedBatchId
  };
}

function sanitizeErrorSummary(error: unknown, connectionString: string): string {
  const raw = error instanceof Error ? error.message : String(error);
  const withoutConnection = raw.split(connectionString).join("[connection string redacted]");
  const withoutMongoUri = withoutConnection.replace(
    /mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi,
    "[connection string redacted]"
  );
  return withoutMongoUri.replace(/\/\/([^:@/\s]+):([^@/\s]+)@/g, "//[credentials redacted]@");
}
