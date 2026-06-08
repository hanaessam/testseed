# Contract: Generation Plan API (Workbench Phase 1)

## Endpoint

`GET /projects/:projectId/generation-plan`

Returns a read-only generation plan for workbench display. Delegates to `build-generation-plan` in core.

Authentication: Required.

## Query Parameters

| Param | Required | Description |
| --- | --- | --- |
| `collectionCounts` | Yes | JSON-encoded map of collection name → non-negative integer |

Example:

```text
GET /projects/project_123/generation-plan?collectionCounts=%7B%22users%22%3A5%2C%22orders%22%3A10%7D
```

## Success Response

Status: `200 OK`

```json
{
  "orderedCollections": ["users", "orders"],
  "items": [
    {
      "collectionName": "users",
      "count": 5,
      "dependencyOrder": 0,
      "referenceFields": [],
      "warnings": []
    },
    {
      "collectionName": "orders",
      "count": 10,
      "dependencyOrder": 1,
      "referenceFields": [
        { "fieldName": "user", "referencedCollection": "users" }
      ],
      "warnings": []
    }
  ],
  "totalRecords": 15,
  "blockingWarnings": [],
  "riskLevel": "none"
}
```

### Response rules

- `orderedCollections` MUST match core dependency order.
- `blockingWarnings` includes cycles, missing referenced collections, and zero-parent reference issues.
- `riskLevel` is `elevated` when `blockingWarnings` is non-empty (UI soft-warn only; does not block API).
- No raw provider output, prompts, or secrets.

## Error Responses

| Status | When |
| --- | --- |
| `400` | Invalid or unknown collection in `collectionCounts` |
| `401` | Unauthenticated |
| `404` | Project not found or not owned |
| `409` | No active schema snapshot |

## Notes

- Workbench calls this when counts change and before Generate.
- Generate endpoint behavior unchanged; plan is informational for UX.
