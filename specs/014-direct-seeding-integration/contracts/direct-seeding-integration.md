# Contract: Direct Seeding Integration API Surface

**Feature**: spec-014 Direct Seeding Integration

**Underlying core contracts**:
- [Direct MongoDB Seeding core contract](../../012-direct-mongodb-seeding/contracts/direct-mongodb-seeding-core.md)
- [Rollback Seed Batch contract](../../013-rollback-seed-batch/contracts/rollback-seed-batch.md)

---

## Dependency Boundary

Integration layer touches only:

| Layer | Files |
|-------|-------|
| API routes (adapter) | `apps/api/src/routes/generation.ts`, `apps/api/src/routes/rollback.ts`, `apps/api/src/routes/history.ts` |
| Web components | `apps/web/src/components/generation/export-drawer.tsx`, `apps/web/src/components/projects/seed-batches-panel.tsx` |
| Web API client | `apps/web/src/lib/api-client.ts` |
| Shared types | `packages/types/src/generation.ts`, `packages/types/src/projects.ts` |

**Must NOT change**: `packages/core`, `packages/db` (integration uses them as-is).

---

## Direct Seeding Endpoints

All endpoints require `Authorization: Bearer <jwt>`. Base path: `/projects/:projectId`.

---

### Test Connection

```
POST /projects/:projectId/direct-seeding/test-connection
```

**Request body**:
```json
{
  "connectionString": "mongodb+srv://user:pass@cluster/db",
  "timeoutMs": 8000
}
```

**Success response** (200):
```json
{
  "ok": true,
  "databaseName": "db",
  "connectionTestToken": "abc123...",
  "connectionFingerprint": "sha256:...",
  "message": "Connection successful"
}
```

**Failure response** (200 — ok:false is not an HTTP error):
```json
{
  "ok": false,
  "errorSummary": "Connection timed out after 8000ms"
}
```

**Security**: `connectionString` is never echoed in the response.

---

### Build Confirmation Summary

```
POST /projects/:projectId/direct-seeding/confirmation
```

**Request body**:
```json
{
  "connectionString": "mongodb+srv://...",
  "connectionTestToken": "abc123...",
  "schema": { /* ParsedMongooseSchema */ },
  "dataset": { /* GeneratedDataset */ },
  "targetDatabaseName": "db"
}
```

**Success response** (200):
```json
{
  "targetDatabaseName": "db",
  "orderedCollections": [
    { "collectionName": "users", "recordCount": 10 },
    { "collectionName": "posts", "recordCount": 25 }
  ],
  "collectionCounts": { "users": 10, "posts": 25 },
  "totalRecordCount": 35,
  "warning": "insertion is irreversible without rollback"
}
```

**Error response** (400):
```json
{ "error": "DIRECT_SEED_DATASET_EMPTY", "message": "Dataset has no records to insert" }
```

---

### Execute Direct Seed

```
POST /projects/:projectId/direct-seeding
```

**Request body**:
```json
{
  "connectionString": "mongodb+srv://...",
  "connectionTestToken": "abc123...",
  "schema": { /* ParsedMongooseSchema */ },
  "dataset": { /* GeneratedDataset */ },
  "targetDatabaseName": "db",
  "confirmed": true,
  "savedDatasetId": "dataset_xyz"
}
```

**Success response** (200):
```json
{
  "report": {
    "seedBatchId": "seed_<uuid>",
    "targetDatabaseName": "db",
    "successfulCollections": [
      { "collectionName": "users", "requestedCount": 10, "insertedCount": 10, "status": "succeeded" },
      { "collectionName": "posts", "requestedCount": 25, "insertedCount": 25, "status": "succeeded" }
    ],
    "failedCollections": [],
    "insertedRecordCounts": { "users": 10, "posts": 25 },
    "totalInsertedCount": 35,
    "rollback": {
      "collectionOrder": ["users", "posts"],
      "insertedDocumentIds": { "users": ["id1", ...], "posts": ["id11", ...] }
    }
  },
  "seedBatch": {
    "id": "...",
    "seedBatchId": "seed_<uuid>",
    "status": "inserted",
    "targetDatabaseName": "db",
    "collectionCounts": { "users": 10, "posts": 25 },
    "collectionOrder": ["users", "posts"],
    "createdAt": "2026-06-23T00:00:00.000Z"
  }
}
```

**Partial failure response** (200 — partial is not an HTTP error):
```json
{
  "report": {
    "seedBatchId": "seed_<uuid>",
    "successfulCollections": [
      { "collectionName": "users", "requestedCount": 10, "insertedCount": 10, "status": "succeeded" }
    ],
    "failedCollections": [
      { "collectionName": "posts", "requestedCount": 25, "insertedCount": 0, "status": "failed", "errorSummary": "Duplicate key error" }
    ],
    "totalInsertedCount": 10
  },
  "seedBatch": { "status": "partially_inserted", ... }
}
```

**Stable error codes** (400 / 409):
| Code | HTTP | Meaning |
|------|------|---------|
| `DIRECT_SEED_CONNECTION_STRING_REQUIRED` | 400 | Missing connection string |
| `DIRECT_SEED_CONNECTION_TEST_REQUIRED` | 400 | No matching connection test token |
| `DIRECT_SEED_CONFIRMATION_REQUIRED` | 400 | `confirmed` not `true` |
| `DIRECT_SEED_DATASET_EMPTY` | 400 | No records in dataset |
| `DIRECT_SEED_VALIDATION_FAILED` | 400 | Dataset failed validation |
| `DIRECT_SEED_GENERATION_ORDER_UNSAFE` | 400 | generationOrder missing non-empty collection |
| `DIRECT_SEED_CONNECTION_FAILED` | 200/ok:false | Connection test failed |

---

## Rollback Endpoint

```
POST /projects/:projectId/rollback
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request body**:
```json
{
  "seedBatchId": "seed_<uuid>",
  "mongoUri": "mongodb+srv://user:pass@cluster/db"
}
```

**Success response** (200):
```json
{
  "batch": { "seedBatchId": "seed_<uuid>", "status": "rolled_back", "rolledBackAt": "...", ... },
  "deletedCounts": { "posts": 25, "users": 10 },
  "event": { "kind": "rollback_completed", "payload": { "seedBatchId": "seed_<uuid>", "deletedCounts": {...} } },
  "report": {
    "seedBatchId": "seed_<uuid>",
    "status": "rolled_back",
    "completedCollections": [
      { "collectionName": "posts", "status": "deleted", "deletedCount": 25 },
      { "collectionName": "users", "status": "deleted", "deletedCount": 10 }
    ],
    "processedOrder": ["posts", "users"],
    "rolledBackAt": "2026-06-23T00:00:00.000Z"
  }
}
```

**Partial failure response** (207):
```json
{
  "report": {
    "status": "partial_failure",
    "completedCollections": [{ "collectionName": "posts", "status": "deleted", "deletedCount": 25 }],
    "failedCollection": { "collectionName": "users", "status": "failed", "error": "Collection deletion failed" }
  }
}
```

**Stable error codes**:
| Code | HTTP | Meaning |
|------|------|---------|
| `ROLLBACK_SEED_BATCH_ID_REQUIRED` | 400 | seedBatchId missing/empty |
| `ROLLBACK_SEED_BATCH_ID_INVALID` | 400 | Invalid format |
| `ROLLBACK_BATCH_NOT_FOUND` | 404 | No batch for this project/seedBatchId |
| `ROLLBACK_BATCH_ALREADY_ROLLED_BACK` | 409 | Duplicate rollback attempt |
| `ROLLBACK_BATCH_HAS_NO_RECORDS` | 409 | Batch has no inserted records |

**Security**: `mongoUri` is never echoed in any response body or event payload.

---

## History Endpoint

```
GET /projects/:projectId/history
Authorization: Bearer <jwt>
```

**Response** (200):
```json
{
  "events": [
    {
      "kind": "seed_batch_recorded",
      "payload": {
        "seedBatchId": "seed_<uuid>",
        "targetDatabaseName": "db",
        "collectionCounts": { "users": 10, "posts": 25 },
        "status": "inserted"
      },
      "createdAt": "..."
    },
    {
      "kind": "rollback_completed",
      "payload": {
        "seedBatchId": "seed_<uuid>",
        "rollbackDeletedCounts": { "posts": 25, "users": 10 },
        "status": "rolled_back"
      },
      "createdAt": "..."
    }
  ],
  "seedBatches": [
    {
      "seedBatchId": "seed_<uuid>",
      "status": "rolled_back",
      "targetDatabaseName": "db",
      "collectionCounts": { "users": 10, "posts": 25 },
      "collectionOrder": ["users", "posts"],
      "createdAt": "...",
      "rolledBackAt": "...",
      "rollbackDeletedCounts": { "posts": 25, "users": 10 }
    }
  ]
}
```

**Security**: No event payload or seed batch field includes connection strings or credentials.

---

## Web API Client Functions

Located in `apps/web/src/lib/api-client.ts`. All require a bearer token.

| Function | Endpoint | Notes |
|----------|----------|-------|
| `testDirectSeedConnection(projectId, request, token)` | POST `.../direct-seeding/test-connection` | Already implemented |
| `buildDirectSeedConfirmation(projectId, request, token)` | POST `.../direct-seeding/confirmation` | Already implemented |
| `executeDirectSeed(projectId, request, token)` | POST `.../direct-seeding` | Already implemented |
| `rollbackSeedBatch(projectId, request, token)` | POST `.../rollback` | Already implemented |
| `applySeedBatchVersion(projectId, request, token)` | POST `.../apply-seed-batch` | Already implemented |
