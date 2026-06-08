# Quickstart: Preview and Editing

## Prerequisites

- Node.js 20+, npm 10+, `npm install`
- `.env` with valid `OPENAI_API_KEY`
- Authenticated user with a project that has a saved schema snapshot
- Branch `007-preview-editing`
- `006` workbench shipped (tables, saved runs, export when `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT=true`)

## Demo flow — canvas editing

1. `npm run dev` — sign in.
2. Open `/generate?projectId={id}&mode=generate` with a reviewed schema.
3. Generate seed data or load a saved run from the left rail.
4. On the **data canvas**, click an editable scalar cell (e.g. `email`, `name`).
5. Change the value; press **Enter** or click outside the cell.
6. Confirm:
   - Value updates in place (no modal).
   - Edited cell shows accent left border + “Edited” marker.
   - Enum field opens dropdown with allowed values only (pick from list).
   - Invalid type shows inline error under the cell.
   - `_id` and reference columns are not editable (tooltip on hover).
7. Press **Escape** while editing — confirm value reverts, no validation flash.
8. Introduce a validation error — confirm **Export JSON** is disabled and issue count appears in header.
9. Fix the cell — confirm export re-enables.
10. Click **Save** (first time after generate) — confirm new saved run appears in list.
11. Edit again → **Save changes** — reload run; confirm values persist.
12. Edit → **Save as new** — confirm second run in saved list.
13. Edit without saving → navigate away — confirm unsaved warning.

## API smoke — cell edit

```http
POST /projects/{projectId}/dataset-edits
Authorization: Bearer {token}
Content-Type: application/json

{
  "schemaSnapshotId": "{snapshotId}",
  "collectionCounts": { "users": 2 },
  "dataset": { "...": "current dataset" },
  "edit": {
    "collectionName": "users",
    "recordId": "507f1f77bcf86cd799439011",
    "fieldName": "role",
    "rawValue": "admin"
  }
}
```

Expect `200` with updated `dataset` and `validationResults`.

## API smoke — patch saved run

```http
PATCH /projects/{projectId}/generated-datasets/{datasetId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "dataset": { "...": "valid dataset" }
}
```

Expect `200` when `status: "valid"` and no error-level validation results.

## Verification

```sh
npx turbo build lint test
```

Contract tests:

- `packages/core/.../apply-cell-edit-to-dataset.test.ts`
- `apps/api/.../dataset-edit.contracts.test.ts`
- `apps/api/.../saved-dataset-patch.contracts.test.ts`

## UX checklist (manual)

- [ ] Editable vs read-only cells visually distinct
- [ ] No modal for routine scalar edit
- [ ] Inline errors use plain language (`message`, not only `code`)
- [ ] Collection tab shows invalid state when collection has errors
- [ ] Editing disabled during generation/refinement
- [ ] Unsaved indicator visible when `hasUnsavedEdits`
