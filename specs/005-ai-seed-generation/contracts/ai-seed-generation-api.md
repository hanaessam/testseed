# Contract: AI Seed Generation API

## Endpoint

`POST /projects/:projectId/generations`

Generates schema-aware seed records for a saved project using the active reviewed schema snapshot.

Authentication: Required.

## Request

```json
{
  "collectionCounts": {
    "users": 5,
    "products": 10,
    "orders": 15
  }
}
```

### Request Rules

- `collectionCounts` is required.
- Each key must match a collection in the active reviewed schema.
- Each value must be a non-negative integer.
- The sum of all counts must be within the safe generation limit.
- At least one collection count should be greater than zero.
- The project must have an active reviewed schema snapshot.

## Success Response

Status: `201 Created`

```json
{
  "dataset": {
    "projectId": "project_123",
    "schemaSnapshotId": "snapshot_456",
    "status": "valid",
    "generationOrder": ["users", "products", "orders"],
    "collectionCounts": {
      "users": 5,
      "products": 10,
      "orders": 15
    },
    "collections": {
      "users": [
        {
          "_id": "665f1a000000000000000001",
          "email": "maya.chen@example.com",
          "role": "customer"
        }
      ],
      "products": [
        {
          "_id": "665f1a000000000000000101",
          "seller": "665f1a000000000000000001",
          "name": "Reusable Water Bottle",
          "price": 24.99
        }
      ],
      "orders": [
        {
          "_id": "665f1a000000000000000201",
          "user": "665f1a000000000000000001",
          "items": ["665f1a000000000000000101"]
        }
      ]
    },
    "validationResults": [],
    "warnings": []
  },
  "message": "Generated valid seed records."
}
```

### Success Guarantees

- Parent collections are listed before child collections in `generationOrder`.
- Records are grouped by collection in `collections`.
- Every reference value points to an existing generated record in the referenced collection.
- Generated values satisfy reviewed field types, required fields, enum values, and references.
- The response is valid JSON and contains no prompts, credentials, connection strings, raw provider errors, or API keys.

## Validation Error Response

Status: `422 Unprocessable Entity`

```json
{
  "message": "Generated records did not pass validation.",
  "validationResults": [
    {
      "severity": "error",
      "collectionName": "orders",
      "recordId": "665f1a000000000000000201",
      "fieldName": "user",
      "code": "REFERENCE_NOT_FOUND",
      "message": "orders.user must reference an existing users record.",
      "suggestedAction": "Increase the users count or review the user reference field."
    }
  ]
}
```

## Planning Error Response

Status: `400 Bad Request`

```json
{
  "message": "Seed generation cannot start with the selected counts.",
  "validationResults": [
    {
      "severity": "error",
      "collectionName": "orders",
      "fieldName": "user",
      "code": "PARENT_COUNT_ZERO",
      "message": "orders.user references users, but users count is zero.",
      "suggestedAction": "Generate at least one users record or make the reference optional in schema review."
    }
  ]
}
```

## Missing Schema Response

Status: `409 Conflict`

```json
{
  "message": "Review and save a schema before generating seed records."
}
```

## Provider Failure Response

Status: `502 Bad Gateway`

```json
{
  "message": "Seed generation provider could not complete the request. Try again or reduce the requested record count."
}
```

## Response Shape Notes

- `collections` must only include reviewed collection names.
- `collectionCounts` reflects the actual returned counts.
- `validationResults` uses stable codes for UI display and testing.
- `warnings` are non-blocking and may include generic-context or low-confidence schema notes.
- Raw provider responses are never returned.

---

## Refinement Endpoint

`POST /projects/:projectId/generations/refinements`

Uses the OpenAI-backed chat workflow to refine or explain a generated dataset.

Authentication: Required.

## Refinement Request

```json
{
  "currentDataset": {
    "projectId": "project_123",
    "schemaSnapshotId": "snapshot_456",
    "status": "valid",
    "generationOrder": ["users", "products", "orders"],
    "collectionCounts": {
      "users": 5,
      "products": 10,
      "orders": 15
    },
    "collections": {}
  },
  "message": "Make all user emails use the university.edu domain.",
  "chatHistory": [
    {
      "role": "user",
      "content": "Make product names more realistic."
    },
    {
      "role": "assistant",
      "content": "Updated product names and preserved all schema constraints."
    }
  ]
}
```

### Refinement Request Rules

- `currentDataset` is required and must have status `valid`.
- `message` is required and must be non-empty.
- `chatHistory` is optional and must contain only sanitized user-facing messages.
- The dataset schema snapshot must match the active reviewed schema snapshot.
- The request must not include credentials, connection strings, API keys, or raw provider payloads.

## Refinement Success Response

Status: `200 OK`

```json
{
  "mode": "updated_dataset",
  "message": "Updated user email domains and preserved schema validity.",
  "dataset": {
    "projectId": "project_123",
    "schemaSnapshotId": "snapshot_456",
    "status": "valid",
    "generationOrder": ["users", "products", "orders"],
    "collectionCounts": {
      "users": 5,
      "products": 10,
      "orders": 15
    },
    "collections": {
      "users": [
        {
          "_id": "665f1a000000000000000001",
          "email": "maya.chen@university.edu",
          "role": "customer"
        }
      ]
    },
    "validationResults": [],
    "warnings": []
  },
  "validationResults": [],
  "warnings": []
}
```

## Refinement Guidance Response

Status: `200 OK`

```json
{
  "mode": "guidance",
  "message": "The current dataset already uses valid order references. You can ask me to adjust totals, statuses, or names.",
  "validationResults": [],
  "warnings": []
}
```

## Refinement Rejected Response

Status: `422 Unprocessable Entity`

```json
{
  "mode": "rejected",
  "message": "The requested refinement could not be applied without violating the reviewed schema.",
  "validationResults": [
    {
      "severity": "error",
      "collectionName": "users",
      "fieldName": "role",
      "code": "ENUM_VALUE_INVALID",
      "message": "users.role must use one of the reviewed enum values.",
      "suggestedAction": "Choose one of the allowed role values or update schema review."
    }
  ]
}
```

### Refinement Guarantees

- A rejected refinement does not replace the current valid dataset.
- Any returned updated dataset is valid JSON grouped by collection.
- Any returned updated dataset preserves valid ObjectId references.
- Non-mutating guidance responses do not change records.
- Responses contain no internal prompts, raw provider payloads, credentials, connection strings, raw provider errors, or API keys.
