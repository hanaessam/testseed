# Quickstart: Preview and Editing

**Feature**: `007-preview-editing`  
**Status**: Shipped

## Prerequisites

- `006` workbench shipped (tables, **dataset versions**, export when `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT=true`)
- Valid schema snapshot saved for the project

## Manual test flow

1. Open `/generate?projectId=…&mode=generate`.
3. Generate seed data or load a **dataset version** from the left rail.
4. Click an editable cell; change value; blur or Enter to commit.
5. Confirm edited cell shows accent border / "Edited" marker.
6. Confirm validation badges update if edit fixes or introduces errors.
7. Click **Save** — confirm a **new** version appears in the versions list (parent unchanged if you had a prior version loaded).
8. Load an older version — confirm prior data is intact.
9. With Export enabled: test connection in Export drawer, then **Re-seed** a version from the left rail and confirm dialog + MongoDB insert.

## API smoke — fork saved version

```http
PATCH /projects/:projectId/generated-datasets/:parentDatasetId
Authorization: Bearer …
Content-Type: application/json

{
  "dataset": { "...": "valid GeneratedDataset" },
  "versionLabel": "Manual edits"
}
```

Expect `200` with `{ "dataset": { "id": "new-id", ... }, "savedDatasetId": "new-id" }`.

## Related

- `docs/dataset-version-history.md`
- `specs/007-preview-editing/contracts/saved-dataset-patch-api.md`
