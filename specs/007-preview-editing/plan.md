# Implementation Plan: Preview and Editing

**Branch**: `007-preview-editing`

**Spec**: `specs/007-preview-editing/spec.md`

**Date**: 2026-06-08

**Status**: Planned (ready for `/speckit-implement`) — `tasks.md` generated (54 tasks)

## Summary

Add **canvas-like inline cell editing** to the generation workbench data canvas. Users click editable cells, commit on blur/Enter, and see inline validation immediately. Export and persistence stay blocked until the dataset is valid.

**Technical approach**: Extend `collection-data-table.tsx` with inline editors; new core use case `applyCellEditToDataset` reuses `validateGeneratedDataset`; API exposes `POST /dataset-edits` and `PATCH /generated-datasets/:id`; web holds session state only (no business logic). Saved-run patch closes the persistence loop from clarify session (first Save creates a run).

## Clarifications driving this plan

| Topic | Decision |
| --- | --- |
| First save after generate | `POST` creates new saved run; becomes active for patch |
| Edit AI-invalid rows | Yes — any editable cell |
| Validation timing | Commit only (blur / Enter) |
| Navigate-away warning | Any unsaved edits |
| Cancel in-cell edit | Escape restores pre-edit value |
| UX tone | Canvas-like, simple, no modals for scalar edits |
| Edited indicator | Accent left border + small “Edited” marker per committed cell |
| Enum fields | Dropdown / select list of reviewed values only |

## Current vs Target

| Area | Current (006) | Target (007) |
| --- | --- | --- |
| Data canvas cells | Read-only preview | In-place editable scalars |
| Validation | Shown after generate/refine | Re-run on every committed edit |
| Export | Blocks on invalid dataset | Same, driven by live edit validation |
| Saved runs | Save on generate/refine only | Patch active run + save as new + manual_edit source |
| `_id` / refs | Display only | Read-only with tooltip |
| Unsaved state | N/A | Dirty indicator + leave warning |

## Technical Context

**Language/Version**: TypeScript strict, Node.js 20+, Next.js 14, React 18, Express 4

**Primary Dependencies**: `validateGeneratedDataset`, `collection-data-table.tsx`, `export-drawer.tsx`, `generation-workbench.tsx`, `api-client.ts`, `@testseed/types`

**Storage**: Edits live in client session until Save; persisted via existing `generated_dataset_records` (+ new PATCH path)

**Testing**: `npx turbo build lint test`; core unit tests for `applyCellEditToDataset`; API contract tests for edit + patch routes

**Target Platform**: Desktop-first web; same click-edit-commit on stacked mobile layout

**Performance Goals**: SC-001/SC-006 — single edit + validation perceived instant for ≤500 records; full-dataset validate on commit acceptable for v1

**Constraints**: No `@testseed/core` in web; no modals for routine edits; editing disabled during generate/refine

**Scale/Scope**: Scalar fields only; paginated table unchanged (PAGE_SIZE 10)

**API surface**:

| Endpoint | Purpose |
| --- | --- |
| `POST /projects/:projectId/dataset-edits` | Apply one cell edit + full revalidation |
| `POST /projects/:projectId/datasets/validate` | Optional full revalidate without edit |
| `PATCH /projects/:projectId/generated-datasets/:datasetId` | Persist edits to active saved run |
| `POST /projects/:projectId/generated-datasets` | Save as new / first save (`source: manual_edit`) |

## Constitution Check

*GATE: Passes before implementation. Re-check after API contracts.*

| Rule | Status |
| --- | --- |
| Dependency direction `types → db → core → api → web` | Pass |
| No business logic in `apps/web` | Pass — web calls API; coercion/validation in core |
| No module-level singletons in `packages/db` | Pass — repository methods injected into core deps |
| No connection strings stored | Pass — no new DB connection flows |
| No Mongoose/Express in core | Pass |

## Project Structure

### Documentation (this feature)

```text
specs/007-preview-editing/
├── spec.md
├── plan.md                      # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── dataset-edit-api.md
│   └── saved-dataset-patch-api.md
├── checklists/
│   └── requirements.md
└── tasks.md                     # /speckit-tasks
```

### Source Code (expected)

```text
packages/types/src/
└── generation.ts                 # + manual_edit source, edit request/response types

packages/core/src/generation/
├── apply-cell-edit-to-dataset.ts # NEW — edit + coerce + validate
├── update-saved-generated-dataset.ts  # NEW — patch persisted run
├── validate-generated-dataset.ts # unchanged rules, reused
├── save-generated-dataset.ts     # accept manual_edit source
└── __tests__/
    ├── apply-cell-edit-to-dataset.test.ts
    └── update-saved-generated-dataset.test.ts

packages/db/src/
└── generated-dataset-repository.ts  # + updateGeneratedDatasetRecord

apps/api/src/routes/
├── generation.ts                 # + dataset-edits POST, PATCH saved dataset
└── routes/__tests__/
    ├── dataset-edit.contracts.test.ts
    └── saved-dataset-patch.contracts.test.ts

apps/web/
├── app/generate/page.tsx           # edit session state, save actions, leave guard
├── components/generation/
│   ├── collection-data-table.tsx   # inline editors, affordances, inline errors
│   ├── editable-table-cell.tsx     # NEW — presentational cell editor
│   ├── dataset-save-bar.tsx        # NEW — Save / Save as new / unsaved chip
│   ├── generation-workbench.tsx    # wire save bar + editingDisabled
│   └── export-drawer.tsx           # consume live validationResults (minimal)
└── src/lib/
    └── api-client.ts               # applyDatasetEdit, patchSavedDataset
```

**Structure Decision**: Monorepo layers unchanged; one new core use case and table cell presentation split for readability.

## Phased Delivery

### Phase 1 — Edit + validate (P1 stories)

**Goal**: Canvas-like editing with inline errors and export blocking.

1. **Types** — `DatasetCellEditRequest`, `DatasetCellEditResponse`, `SavedGeneratedDatasetSource` + `manual_edit`.
2. **Core** — `applyCellEditToDataset`:
   - Field editability guard (`_id`, refs, nested types).
   - Coerce `rawValue` → typed value per `SchemaField`.
   - Immutable dataset update.
   - Delegate to `validateGeneratedDataset`.
3. **API** — `POST /projects/:projectId/dataset-edits` with Zod validation; load schema snapshot from project.
4. **Web** — `EditableTableCell` + `collection-data-table.tsx`:
   - Click to edit; blur/Enter commit → `applyDatasetEdit` API.
   - Escape cancel locally.
   - Read-only styling + tooltip for `_id`/refs.
   - Edited indicator on committed cells (`border-l-2 border-accent` + `Edited` dot/label).
   - Enum fields: `Select` / native `<select>` with `field.enum` options (no free-text).
   - Inline `message` under cell (not only code badge).
5. **Web** — `page.tsx` updates `dataset`, `validationResults`, `warnings` from API; pass `editingDisabled` during generate/refine.
6. **Export** — ensure `export-drawer` receives updated validation props after edits.

**Exit criteria**: User stories 1–3, 6; FR-001–006, FR-010, FR-012–017; SC-001–003, SC-005–007.

### Phase 2 — Persist + unsaved state (P2 stories)

**Goal**: Save edits to runs; protect unsaved work.

1. **Core** — `updateSavedGeneratedDataset` with valid-dataset gate.
2. **DB** — `updateGeneratedDatasetRecord` repository method.
3. **API** — `PATCH /generated-datasets/:datasetId`; extend save POST for `manual_edit`.
4. **Web** — `dataset-save-bar.tsx`:
   - Unsaved chip when `hasUnsavedEdits`.
   - Save (POST or PATCH per active run).
   - Save as new.
   - Block save when invalid (same summary as export).
5. **Web** — `beforeunload` + route-change confirm when unsaved.

**Exit criteria**: User story 5; FR-007, FR-008, FR-011; SC-004.

### Phase 3 — Polish (optional if timeboxed)

- Validation summary panel with jump-to-cell navigation (FR-004 navigable summary).
- `POST /datasets/validate` for schema-reload edge case.
- Contract tests + README note in `testseed-readme-update` skill scope.

## UX Design Notes (canvas-like)

Align with `docs/ui-design.md` and spec **Experience principles**:

| Pattern | Implementation hint |
| --- | --- |
| Editable affordance | `cursor-text`, hover `bg-accent/5` on editable cells |
| Read-only | Muted background, `cursor-not-allowed`, title tooltip |
| Focus | `ring-2 ring-accent` on active editor |
| Edited | `border-l-2 border-accent` + small `Edited` pill/dot on committed cell (FR-016) |
| Enum | **Required** — shadcn `Select` or native `<select>` listing all `field.enum` values; selection commits on pick + blur (FR-018) |
| Boolean | Checkbox or two-option select |
| Errors | `text-danger-text text-[11px]` under cell; keep table scrollable |
| Header status | `3 issues` badge → switches collection tab + scrolls to row |

No modals, no JSON editor, no second page.

## Complexity Tracking

No constitution violations requiring justification.

## Agent Context

After tasks generation, active Spec Kit pointer:

- `specs/007-preview-editing/spec.md`
- `specs/007-preview-editing/plan.md`

## Next Steps

1. `/speckit-tasks` — generate `tasks.md`
2. `/speckit-implement` or manual TDD following `types → core → api → web`
3. Run `quickstart.md` demo flow before merge
