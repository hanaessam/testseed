# Contract: Feedback Regeneration API

## Endpoint

`POST /projects/:projectId/generations/regenerate`

Performs feedback-based iterative regeneration using the last accepted dataset plus new user feedback.

Authentication: Required.

## Request

```json
{
  "acceptedDataset": {
    "projectId": "project_123",
    "schemaSnapshotId": "snapshot_456",
    "status": "valid",
    "generationOrder": ["users", "orders"],
    "collectionCounts": { "users": 5, "orders": 10 },
    "collections": {}
  },
  "projectContext": "B2C commerce platform for Canadian users.",
  "schemaContext": "users(8), orders(12)",
  "collectionCounts": { "users": 5, "orders": 10 },
  "feedback": "Use Canadian addresses for users.",
  "chatHistory": [
    {
      "role": "user",
      "content": "Make names more diverse."
    }
  ]
}
```

## Request rules

- `acceptedDataset` is required and must be schema-valid.
- `projectContext` is required (nullable allowed) and must reflect the active project context snapshot.
- `schemaContext` is required and must match active reviewed schema context.
- `collectionCounts` is required and must match accepted dataset count context.
- `feedback` is required and must be non-empty.
- Only one regeneration request may be active per workbench session.
- Unsaved manual preview edits must not be part of the regeneration payload.
- Request must not include secrets, connection strings, or raw provider payloads.

## Success response

Status: `200 OK`

### Accepted outcome

```json
{
  "mode": "accepted",
  "message": "Applied requested address localization while preserving schema validity.",
  "dataset": {
    "projectId": "project_123",
    "schemaSnapshotId": "snapshot_456",
    "status": "valid",
    "generationOrder": ["users", "orders"],
    "collectionCounts": { "users": 5, "orders": 10 },
    "collections": {}
  },
  "validationResults": [],
  "warnings": [],
  "chatHistory": []
}
```

### Partial outcome

```json
{
  "mode": "partial",
  "message": "Applied address localization, skipped request to change required enum values.",
  "validationResults": [],
  "warnings": [],
  "chatHistory": []
}
```

### Rejected outcome

```json
{
  "mode": "rejected",
  "message": "The requested changes could not be applied without violating schema constraints.",
  "validationResults": [
    {
      "severity": "error",
      "collectionName": "users",
      "fieldName": "role",
      "code": "ENUM_VALUE_INVALID",
      "message": "users.role must be one of the reviewed enum values."
    }
  ],
  "warnings": [],
  "chatHistory": []
}
```

### Cancelled outcome

Status: `200 OK`

```json
{
  "mode": "cancelled",
  "message": "Regeneration was cancelled before completion.",
  "validationResults": [],
  "warnings": [],
  "chatHistory": []
}
```

## Error responses

| Status | When |
| --- | --- |
| `400` | Invalid request shape or empty feedback message |
| `401` | Unauthenticated |
| `404` | Project not found or not owned |
| `409` | No accepted dataset available or schema snapshot mismatch |
| `429` | Concurrent regeneration submit attempted while one is in flight |
| `502` | Provider failure during regeneration |

## Behavioral guarantees

- The currently accepted dataset is not replaced unless `mode` is `accepted`.
- On `partial`, `rejected`, or `cancelled`, the response includes clear user-facing explanation.
- If client navigates away and aborts request, server should stop work best-effort and avoid committing intermediate state.
- Export/direct seeding/rollback contracts remain unchanged.
