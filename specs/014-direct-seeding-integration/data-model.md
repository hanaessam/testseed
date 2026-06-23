# Data Model: Direct Seeding Integration

**Feature**: spec-014 Direct Seeding Integration

---

## Overview

This document describes how existing types flow through the integration layer. No new types are introduced; all contracts are defined in `packages/types/src/generation.ts` and `packages/types/src/projects.ts`.

---

## End-to-End Seeding Flow

### Step 1: Connection Test

**Request** (`DirectMongoConnectionTestRequest`):
```ts
{
  connectionString: string;   // transient — never stored, logged, or returned
  timeoutMs?: number;         // clamped to 5000–10000ms
}
```

**Response** (`DirectMongoConnectionTestResult`):
```ts
{
  ok: boolean;
  databaseName?: string;          // operational context; safe to display
  connectionTestToken?: string;   // non-secret proof of successful test
  connectionFingerprint?: string; // non-secret; for client-side token matching
  message?: string;               // developer-facing status
  errorSummary?: string;          // sanitized failure description
  // connectionString is NEVER included
}
```

**Validation rules**:
- `connectionString` must be non-empty
- Client closed in `finally` on all paths
- On failure: `ok: false`, sanitized `errorSummary`, no connection string

---

### Step 2: Confirmation Summary

**Request** (`DirectSeedingConfirmationRequest`):
```ts
{
  connectionString: string;         // transient
  connectionTestToken: string;      // must match result from Step 1
  schema: ParsedMongooseSchema;
  dataset: GeneratedDataset;
  targetDatabaseName: string;
}
```

**Response** (`DirectSeedingConfirmationSummary`):
```ts
{
  targetDatabaseName: string;
  orderedCollections: Array<{
    collectionName: string;
    recordCount: number;
  }>;
  collectionCounts: Record<string, number>;
  totalRecordCount: number;
  warning: string;  // "insertion is irreversible without rollback"
}
```

**Validation rules**:
- `dataset` must be non-empty
- `dataset.generationOrder` must include every non-empty collection
- No database connection created for this step

---

### Step 3: Execute Direct Seed

**Request** (`DirectSeedingRequest`):
```ts
{
  connectionString: string;         // transient
  connectionTestToken: string;      // must match test result for this connection
  schema: ParsedMongooseSchema;
  dataset: GeneratedDataset;
  targetDatabaseName: string;
  confirmed: true;                  // explicit; if false/absent, insertion is blocked
  seedBatchId?: string;             // optional pre-assigned UUID; otherwise generated
  insertMode?: "insert" | "upsert";
  savedDatasetId?: string;          // link to saved dataset version
}
```

**Response** (`DirectSeedingExecuteApiResponse`):
```ts
{
  report: DirectSeedingReport;
  seedBatch: SeedBatch;             // recorded in TestSeed DB by API route
}
```

**`DirectSeedingReport`**:
```ts
{
  seedBatchId: string;              // UUID v4 — one per operation
  targetDatabaseName: string;
  successfulCollections: Array<InsertedCollectionResult>;
  failedCollections: Array<InsertedCollectionResult>;
  insertedRecordCounts: Record<string, number>;
  totalInsertedCount: number;
  rollback: {
    collectionOrder: string[];
    insertedDocumentIds: Record<string, string[]>;
  };
  // connectionString is NEVER included
}
```

**`InsertedCollectionResult`**:
```ts
{
  collectionName: string;
  requestedCount: number;
  insertedCount: number;
  status: "succeeded" | "failed";
  errorSummary?: string;  // sanitized; no connection strings
}
```

**Validation rules**:
- `confirmed` must be explicitly `true`
- `connectionTestToken` must match the token from Step 1
- Dataset validated by `validateGeneratedDataset` before any insert
- One UUID v4 `seedBatchId` per operation; added to record copies (input not mutated)
- Collections inserted sequentially in `dataset.generationOrder`; stops on first failure
- Client closed in `finally` on all paths

---

## Rollback Flow

**Request** (API body, mapped to `RollbackSeedBatchRequest` in core):
```ts
{
  seedBatchId: string;   // trimmed before validation
  mongoUri: string;      // transient — never stored, logged, or returned
}
```

**Response** (`RollbackSeedBatchResponse`):
```ts
{
  batch: SeedBatch;                   // updated with rolled_back status
  deletedCounts: Record<string, number>;
  event?: ProjectEvent;               // rollback_completed event
  report?: RollbackSeedBatchReport;
  restoredSeedBatch?: SeedBatch;      // auto-restored previous batch, if available
  restoreMessage?: string;
}
```

**`RollbackSeedBatchReport`**:
```ts
{
  seedBatchId: string;
  status: "rolled_back" | "partial_failure";
  deletedCounts: Record<string, number>;
  completedCollections: Array<{ collectionName: string; status: "deleted"; deletedCount: number }>;
  failedCollection?: { collectionName: string; status: "failed"; error: string };
  processedOrder: string[];
  rolledBackAt?: Date;
  // mongoUri / connectionString is NEVER included
}
```

**Validation rules**:
- `seedBatchId` trimmed; rejected if empty/whitespace/invalid format
- Batch must exist and belong to authenticated user's project
- Batch status must NOT be `rolled_back` — duplicate rollback rejected
- Batch must have at least one inserted record
- Collections deleted in reverse `collectionOrder` (stored at insert time)
- Deletion filter: `{ seedBatchId }` — never deletes records from other batches
- Client closed in `finally` on all paths

---

## Seed Batch Entity (TestSeed DB)

Stored in `seed_batches` collection; managed by `packages/db/src/repositories/project-history-repository.ts`.

```ts
interface SeedBatch {
  id: string;
  projectId: string;
  actorId: string;                      // authenticated user
  seedBatchId: string;                  // unique per project; from direct seeding
  savedDatasetId?: string;              // link to generated_dataset_records
  collectionCounts: Record<string, number>;
  insertedDocumentIds: Record<string, string[]>;
  collectionOrder: string[];            // original insertion order; reversed for rollback
  targetDatabaseName: string;           // safe to display; not a secret
  status: "pending" | "inserted" | "partially_inserted" | "rolled_back" | "superseded";
  createdAt: Date;
  rolledBackAt?: Date;
  rollbackDeletedCounts?: Record<string, number>;
  // connectionString: NEVER included
}
```

**Status transitions**:
```
pending             → inserted (on full success)
pending             → partially_inserted (on partial failure)
inserted            → rolled_back (on successful rollback)
partially_inserted  → rolled_back (on successful rollback of inserted collections)
inserted            → superseded (when a newer batch is applied as active version)
rolled_back         → rejected for duplicate rollback
pending             → rejected for rollback (no inserted records)
```

---

## Project Event Entity (TestSeed DB)

Stored in `project_events` collection (append-only).

| `kind` | When created | Key payload fields |
|--------|-------------|-------------------|
| `seed_batch_recorded` | After successful or partial direct seeding | `seedBatchId`, `targetDatabaseName`, `collectionCounts`, `status` |
| `rollback_completed` | After successful or partial rollback | `seedBatchId`, `rollbackDeletedCounts`, `status` |
| `seed_batch_restored` | After a previous batch is auto-restored | `seedBatchId`, `restoredFrom` |

**Security rule**: Event payloads must NOT include `mongoUri`, `connectionString`, or any connection credential.

---

## Rollback Eligibility Matrix

| Batch Status | Can Roll Back | Reason |
|-------------|---------------|--------|
| `inserted` | Yes | Records exist and are tagged with seedBatchId |
| `partially_inserted` | Yes | Inserted collections can be rolled back |
| `pending` | No | No inserted records |
| `rolled_back` | No | Already rolled back; duplicate rejected |
| `superseded` | Configurable | May or may not be eligible depending on product decision |
