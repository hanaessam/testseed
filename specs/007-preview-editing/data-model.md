# Data Model: Preview and Editing

Extends `specs/006-generation-workbench/data-model.md` and `specs/005-ai-seed-generation/data-model.md`.

## Dataset Edit Session (client)

Ephemeral state in `apps/web/app/generate/page.tsx` (or extracted hook). Presentation and sync only — no validation rules.

| Field | Type | Description |
| --- | --- | --- |
| `currentDataset` | `GeneratedDataset \| null` | Active in-memory dataset including manual edits |
| `validationResults` | `GenerationValidationResult[]` | Latest from API after commit or load |
| `warnings` | `GenerationValidationResult[]` | Non-blocking plan/schema warnings |
| `activeSavedDatasetId` | `string \| null` | Loaded or first-saved run id |
| `baselineFingerprint` | `string \| null` | Hash of last persisted dataset for dirty detection |
| `hasUnsavedEdits` | `boolean` | `currentDataset` differs from baseline |
| `editingStatus` | enum | `idle` \| `editing_cell` \| `committing` \| `saving` |
| `editingDisabled` | `boolean` | True during generation/refinement in progress |
| `lastEditedCells` | `EditedCellMarker[]` | Committed edits for FR-016 indicator |

### State transitions

```text
idle → editing_cell (click editable cell)
editing_cell → idle (Escape, no API)
editing_cell → committing (blur/Enter)
committing → idle (API success, dataset updated)
committing → editing_cell (API error on network, cell unchanged)
idle → saving (Save / Save as new)
saving → idle (persist success, baseline updated)
```

## Cell Edit Request (API → core)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `collectionName` | string | yes | Target collection |
| `recordId` | string | yes | `_id` of row |
| `fieldName` | string | yes | Schema field name |
| `rawValue` | string | yes | Committed text from inline editor (coerced in core) |

Bundled with full dataset context on validate-only path, or applied server-side via edit endpoint.

## Cell Edit Response

| Field | Type | Description |
| --- | --- | --- |
| `dataset` | `GeneratedDataset` | Updated dataset after edit + full revalidation |
| `validationResults` | `GenerationValidationResult[]` | All errors |
| `warnings` | `GenerationValidationResult[]` | Warnings |
| `status` | `valid` \| `invalid` | Aggregate validity |
| `rejected?` | object | Present when field not editable or coercion fails before mutate |

## Edited Cell Marker (client)

| Field | Type | Description |
| --- | --- | --- |
| `collectionName` | string | Collection |
| `recordId` | string | Row `_id` |
| `fieldName` | string | Field |
| `committedAt` | string | ISO timestamp |

Used for subtle edited-state styling; cleared when baseline resets after save or load.

## Field Editability (core rule set)

| Rule | `editable` |
| --- | --- |
| `fieldName === "_id"` | false |
| `field.ref` defined | false |
| `field.type` in `Array`, `Object`, `Mixed` | false |
| Scalar String / Number / Boolean / Date | true |
| `ObjectId` without ref on non-id field | false (v1) |

## Update Saved Dataset Request (PATCH)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `dataset` | `GeneratedDataset` | yes | Full valid dataset snapshot |
| `chatHistory` | `ChatRefinementMessage[]` | no | Unchanged unless explicitly sent |

**Validation**: Core rejects PATCH when `dataset.status !== "valid"` or errors present.

## Save As New Request

Reuses `SaveGeneratedDatasetRequest` with `source: "manual_edit"`.

## Collection Table View (extended)

Extends 006 `Collection Table View`:

| Field | Type | Description |
| --- | --- | --- |
| `columns[].editable` | boolean | From core editability rules |
| `columns[].inputKind` | enum | `text` \| `number` \| `boolean` \| `date` \| `enum` \| `readonly` |
| `columns[].enumOptions` | string[] | When `inputKind === enum`; rendered as dropdown/select only |
| `rows[].cells[].isEdited` | boolean | From `lastEditedCells`; drives accent border + “Edited” marker |
| `rows[].cells[].isEditing` | boolean | Active inline editor |
| `rows[].cells[].errorMessage` | string \| null | Plain-language inline error |

## Relationships

```text
Generation Workbench Session
  ├── currentDataset (1)
  ├── validationResults (*)
  └── Dataset Edit Session (1)
        └── lastEditedCells (*)

SavedGeneratedDataset (persisted)
  └── collections (same shape as GeneratedDataset)

applyCellEditToDataset → validateGeneratedDataset → GenerationValidationResult[]
```
