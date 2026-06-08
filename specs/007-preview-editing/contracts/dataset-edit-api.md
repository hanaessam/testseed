# Contract: Dataset Cell Edit API

**Feature**: `007-preview-editing`  
**Layer**: `apps/api` adapter → `packages/core` (`applyCellEditToDataset`, `validateGeneratedDataset`)

## POST `/projects/:projectId/dataset-edits`

Apply one committed cell edit and revalidate the full dataset.

### Auth

- Requires authenticated session (same as generation routes).
- User must own the project.

### Request body

```json
{
  "schemaSnapshotId": "snap_abc123",
  "collectionCounts": { "users": 3, "orders": 5 },
  "dataset": { "...": "GeneratedDataset shape" },
  "edit": {
    "collectionName": "users",
    "recordId": "507f1f77bcf86cd799439011",
    "fieldName": "email",
    "rawValue": "dev@example.com"
  }
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `schemaSnapshotId` | string | yes | Must match dataset and active snapshot |
| `collectionCounts` | object | yes | Used by validation (count mismatch rules) |
| `dataset` | GeneratedDataset | yes | Current in-memory dataset before edit |
| `edit.collectionName` | string | yes | |
| `edit.recordId` | string | yes | 24-char ObjectId string |
| `edit.fieldName` | string | yes | |
| `edit.rawValue` | string | yes | Committed cell text; core coerces by field type |

### Success response `200`

```json
{
  "dataset": { "...": "updated GeneratedDataset" },
  "status": "valid",
  "validationResults": [],
  "warnings": []
}
```

- `dataset.status` mirrors aggregate `status`.
- `validationResults` includes all errors (not only the edited cell).

### Rejected edit `422`

Field not editable or coercion failed before mutation:

```json
{
  "error": "FIELD_NOT_EDITABLE",
  "message": "Reference fields cannot be edited.",
  "fieldName": "authorId",
  "collectionName": "posts"
}
```

### Error responses

| Status | When |
| --- | --- |
| `400` | Malformed body (Zod) |
| `401` | Unauthenticated |
| `403` | Project not owned |
| `404` | Project or schema snapshot not found |
| `409` | `schemaSnapshotId` / `projectId` mismatch |

### Core behavior

1. Load reviewed schema for `schemaSnapshotId` (API fetches, passes to core).
2. `applyCellEditToDataset({ dataset, schema, collectionCounts, edit })`.
3. Return updated dataset + validation output.

### Web usage

- Called on cell commit (blur / Enter) only.
- Escape cancels locally without calling this endpoint.
- Page replaces `currentDataset`, `validationResults`, `warnings` from response.

## POST `/projects/:projectId/datasets/validate` (optional companion)

Revalidate an in-memory dataset without applying an edit (e.g., after schema reload).

### Request body

```json
{
  "schemaSnapshotId": "snap_abc123",
  "collectionCounts": { "users": 3 },
  "dataset": { "...": "GeneratedDataset" }
}
```

### Response `200`

Same shape as edit success without mutation.

**Note**: Implement if schema-reload edge case needs explicit revalidate; otherwise edit endpoint + load paths may suffice.
