# Contract: Saved Dataset Patch API

**Feature**: `007-preview-editing`  
**Layer**: `apps/api` → `packages/core` (`updateSavedGeneratedDataset`)

## PATCH `/projects/:projectId/generated-datasets/:datasetId`

Persist manual edits to the active saved run.

### Auth

- Authenticated owner of project.

### Request body

```json
{
  "dataset": {
    "projectId": "proj_1",
    "schemaSnapshotId": "snap_abc",
    "status": "valid",
    "generationOrder": ["users", "orders"],
    "collectionCounts": { "users": 3, "orders": 5 },
    "collections": { "...": "..." },
    "validationResults": [],
    "warnings": [],
    "createdAt": "2026-06-08T12:00:00.000Z"
  }
}
```

### Validation (core)

- Reject if `dataset.status !== "valid"`.
- Reject if any `validationResults` entry has `severity: "error"`.
- `datasetId` must exist and belong to `projectId`.

### Success `200`

```json
{
  "dataset": { "...": "SavedGeneratedDataset with id" }
}
```

### Errors

| Status | When |
| --- | --- |
| `422` | Dataset invalid or has validation errors |
| `404` | Project or saved dataset not found |

## POST `/projects/:projectId/generated-datasets` (extend existing save)

Save as new run after manual edits (first save after fresh generation uses same endpoint).

### Request body (additions)

```json
{
  "dataset": { "...": "valid GeneratedDataset" },
  "source": "manual_edit",
  "name": "Optional user label",
  "chatHistory": []
}
```

### Types change

Extend `SavedGeneratedDatasetSource`:

```ts
type SavedGeneratedDatasetSource = "generation" | "refinement" | "manual_edit";
```

### Success `201`

```json
{
  "dataset": { "...": "SavedGeneratedDataset" },
  "savedDatasetId": "ds_new"
}
```

## Client flows

| User action | API |
| --- | --- |
| First Save (no active run) | `POST .../generated-datasets` with `source: manual_edit` |
| Save changes (active run) | `PATCH .../generated-datasets/:id` |
| Save as new | `POST .../generated-datasets` with `source: manual_edit` |

After success, client sets `activeSavedDatasetId` and refreshes `baselineFingerprint`.
