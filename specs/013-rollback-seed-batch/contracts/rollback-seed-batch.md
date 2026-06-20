# Contract: Rollback Seed Batch

## Core Use Case

```ts
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
```

## Core Result

```ts
export interface RollbackSeedBatchSuccess {
  batch: SeedBatch;
  report: {
    seedBatchId: string;
    status: "rolled_back";
    deletedCounts: Record<string, number>;
    completedCollections: Array<{
      collectionName: string;
      status: "deleted";
      deletedCount: number;
    }>;
    processedOrder: string[];
    rolledBackAt: Date;
  };
  event: ProjectEvent;
}

export interface RollbackSeedBatchPartialFailure {
  batch: SeedBatch;
  report: {
    seedBatchId: string;
    status: "partial_failure";
    deletedCounts: Record<string, number>;
    completedCollections: Array<{
      collectionName: string;
      status: "deleted";
      deletedCount: number;
    }>;
    failedCollection: {
      collectionName: string;
      status: "failed";
      error: string;
    };
    processedOrder: string[];
  };
}
```

Core may throw typed/sanitized rollback errors for validation and eligibility failures:

| Code | HTTP mapping | Meaning |
| --- | --- | --- |
| `ROLLBACK_SEED_BATCH_ID_REQUIRED` | 400 | `seedBatchId` missing, empty, or whitespace. |
| `ROLLBACK_SEED_BATCH_ID_INVALID` | 400 | `seedBatchId` format does not match direct seeding batch ids. |
| `ROLLBACK_BATCH_NOT_FOUND` | 404 | No seed batch metadata exists for project and seedBatchId. |
| `ROLLBACK_BATCH_ALREADY_ROLLED_BACK` | 409 | Batch status is already `rolled_back`. |
| `ROLLBACK_BATCH_HAS_NO_RECORDS` | 409 | Metadata contains no inserted records to roll back. |
| `ROLLBACK_COLLECTION_DELETE_FAILED` | 200 or 207 style adapter response | At least one collection was deleted before a later collection failed; return partial report. |

Errors and reports must not include MongoDB connection strings.

## API Adapter

Existing route shape:

```http
POST /projects/:projectId/rollback
Authorization: Bearer <token>
Content-Type: application/json

{
  "seedBatchId": "seed_<uuid-or-direct-seeding-format>",
  "mongoUri": "mongodb+srv://..."
}
```

Adapter responsibilities:

- Require authentication.
- Validate `projectId`, `seedBatchId`, and transient `mongoUri`.
- Open a MongoDB native-driver connection only for this request.
- Delegate rollback decisions to core.
- Implement `deleteRecordsBySeedBatchId` as one delete per collection:

```ts
collection.deleteMany({ seedBatchId })
```

- Close the MongoDB client in `finally` on success, rejection after open, and failure.
- Map sanitized core errors to HTTP responses.
- Never return `mongoUri`, raw connection details, or stored connection-string data.

Success response:

```json
{
  "seedBatchId": "seed_123",
  "status": "rolled_back",
  "deletedCounts": {
    "orders": 5,
    "users": 2
  },
  "completedCollections": [
    { "collectionName": "orders", "status": "deleted", "deletedCount": 5 },
    { "collectionName": "users", "status": "deleted", "deletedCount": 2 }
  ],
  "processedOrder": ["orders", "users"],
  "rolledBackAt": "2026-06-09T00:00:00.000Z"
}
```

Partial-failure response:

```json
{
  "seedBatchId": "seed_123",
  "status": "partial_failure",
  "deletedCounts": {
    "orders": 5
  },
  "completedCollections": [
    { "collectionName": "orders", "status": "deleted", "deletedCount": 5 }
  ],
  "failedCollection": {
    "collectionName": "users",
    "status": "failed",
    "error": "Collection deletion failed"
  },
  "processedOrder": ["orders", "users"]
}
```
