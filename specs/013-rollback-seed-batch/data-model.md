# Data Model: Rollback Seed Batch

## Rollback Request

Represents the active rollback command.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `projectId` | `string` | Yes | TestSeed project that owns the seed batch. |
| `actorId` | `string` | Yes | Authenticated user requesting rollback. |
| `seedBatchId` | `string` | Yes | Trimmed direct seeding batch identifier. Missing, whitespace, or invalid format is rejected. |
| `mongoUri` | `string` | Adapter only | Used transiently by API/native-driver adapter. Never passed into core reports or persisted. |

## Seed Batch

Existing TestSeed metadata for a direct seeding operation.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string` | Yes | TestSeed metadata record id. |
| `projectId` | `string` | Yes | Owning project id. |
| `actorId` | `string` | Yes | User that created the batch. |
| `seedBatchId` | `string` | Yes | Unique per project. |
| `collectionCounts` | `Record<string, number>` | Yes | Inserted count by collection. |
| `insertedDocumentIds` | `Record<string, string[]>` | Yes | Inserted document ids by collection for reporting/debug support, not the primary delete filter. |
| `collectionOrder` | `string[]` | Yes | Original generation/insertion order. Rollback processes `collectionOrder` in reverse. |
| `status` | `"pending" | "inserted" | "partially_inserted" | "rolled_back"` | Yes | Only eligible inserted batches can complete rollback. Already `rolled_back` is rejected. |
| `createdAt` | `Date` | Yes | Batch metadata creation time. |
| `rolledBackAt` | `Date` | No | Set when rollback succeeds. |
| `rollbackDeletedCounts` | `Record<string, number>` | No | Deleted counts by collection from successful rollback. |

## Rollback Status

Eligibility states:

| Current state | Rollback behavior |
| --- | --- |
| `inserted` | Eligible when at least one batch record exists. |
| `partially_inserted` | Eligible for inserted collections; rollback still uses reverse collection order and only deletes tagged records. |
| `rolled_back` | Rejected before deletion. |
| `pending` | Rejected before deletion because there are no confirmed inserted records. |

## Rollback Collection Result

Per-collection deletion outcome.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `collectionName` | `string` | Yes | Target collection. |
| `deletedCount` | `number` | Yes for completed collections | Count returned by the user database delete operation. |
| `status` | `"deleted" | "failed"` | Yes | Collection-level outcome. |
| `error` | `string` | Failed only | Sanitized summary. Must not contain connection strings. |

## Rollback Report

Structured result returned by core/API.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `seedBatchId` | `string` | Yes | Requested seed batch id. |
| `status` | `"rolled_back" | "partial_failure"` | Yes | Final rollback result. |
| `deletedCounts` | `Record<string, number>` | Yes | Completed deletion counts by collection. |
| `completedCollections` | `RollbackCollectionResult[]` | Yes | Collections completed before success/failure. |
| `failedCollection` | `RollbackCollectionResult` | Partial failure only | First failed collection, with sanitized error. |
| `processedOrder` | `string[]` | Yes | Actual collection order attempted. |
| `rolledBackAt` | `Date` | Success only | Timestamp persisted on seed batch metadata. |

## Validation Rules

- `seedBatchId` is trimmed before validation.
- Missing, empty, whitespace-only, or invalid-format `seedBatchId` is rejected before deletion.
- Unknown `seedBatchId` is rejected before deletion.
- `status === "rolled_back"` is rejected before deletion.
- Batches with no recorded inserted records are rejected before deletion.
- Rollback deletion filter must include `seedBatchId`.
- Connection strings never appear in any data model output.

## State Transitions

```text
inserted            -> rolled_back
partially_inserted  -> rolled_back
pending             -> rejected
rolled_back         -> rejected
```

Partial deletion failure does not mark the batch `rolled_back`; it returns a partial-failure report with completed counts and the failed collection so the caller can decide the next operational step.
