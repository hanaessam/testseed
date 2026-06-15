# Contract: Saved Dataset Patch API (Fork)

**Feature**: `007-preview-editing` + dataset version history  
**Layer**: `apps/api` → `packages/core` (`forkSavedGeneratedDataset`)

## PATCH `/projects/:projectId/generated-datasets/:datasetId`

**Fork** manual edits into a **new** dataset version. The `:datasetId` path parameter is the **parent** version id.

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
  },
  "chatHistory": [],
  "versionLabel": "Manual edits",
  "source": "manual_edit"
}
```

| Field | Required | Description |
| --- | --- | --- |
| `dataset` | yes | Full valid dataset snapshot |
| `chatHistory` | no | Defaults to parent version chat |
| `versionLabel` | no | Defaults to `Manual edits` |
| `source` | no | `manual_edit` (default) or `refinement` (e.g. accept candidate) |

### Validation (core)

- Reject if `dataset.status !== "valid"`.
- Reject if any `validationResults` entry has `severity: "error"`.
- Parent `datasetId` must exist and belong to `projectId`.

### Success `200`

```json
{
  "dataset": { "...": "SavedGeneratedDataset with new id" },
  "savedDatasetId": "ds_new"
}
```

Client MUST set `activeSavedDatasetId` to `savedDatasetId` (not the parent id).

### Errors

| Status | When |
| --- | --- |
| `422` | Dataset invalid or has validation errors |
| `404` | Project or parent version not found |

## POST `/projects/:projectId/generated-datasets`

Create a new version (first save or save-as-new).

### Request body

```json
{
  "dataset": { "...": "valid GeneratedDataset" },
  "chatHistory": [],
  "parentDatasetId": "ds_parent_optional",
  "versionLabel": "Manual edits"
}
```

### Success `201`

```json
{
  "dataset": { "...": "SavedGeneratedDataset" },
  "savedDatasetId": "ds_new"
}
```

## Client flows

| User action | API | Result |
| --- | --- | --- |
| First Save (no active version) | `POST .../generated-datasets` | New version, no parent |
| Save changes (active version) | `PATCH .../generated-datasets/:parentId` | **Fork** new version |
| Save as new | `POST` with `parentDatasetId` | New version with lineage |
| Accept regeneration candidate | `PATCH` with `source: refinement`, label `Accepted refinement` | Fork refined dataset |

After success, client sets `activeSavedDatasetId` to `savedDatasetId` and refreshes `baselineFingerprint`.

## Related

- `docs/dataset-version-history.md`
- `packages/core/src/generation/fork-saved-generated-dataset.ts`
