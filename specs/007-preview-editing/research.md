# Research: Preview and Editing (Canvas-Like Workbench)

**Date**: 2026-06-08

**Spec**: `specs/007-preview-editing/spec.md`

**Builds on**: `006-generation-workbench` (data canvas, dataset versions, export drawer), `005-ai-seed-generation` (`validateGeneratedDataset`)

## Problem recap

The workbench already previews generated records in `collection-data-table.tsx` with validation badges, but cells are read-only. Users cannot fix individual values on the data canvas without AI refinement or external JSON editing.

## Decisions

### Decision: Core owns cell edit application and validation

**Rationale**: Constitution forbids business logic in `apps/web`. `validateGeneratedDataset` already encodes schema rules (types, enums, required, unique, references). A new pure function `applyCellEditToDataset` in `packages/core` will:

1. Reject edits on non-editable fields (`_id`, reference fields, nested/array/mixed types for v1).
2. Coerce committed raw input to the reviewed field type.
3. Immutably update the target record in the dataset.
4. Call `validateGeneratedDataset` on the full dataset (per FR-002 and clarify session).

**Alternatives considered**:

- Client-side validation in web: rejected — duplicates core rules and violates dependency rule.
- Validate-only API with web applying edits: rejected — edit application is business logic.

**Chosen**: `applyCellEditToDataset` + existing `validateGeneratedDataset`; API adapter exposes `POST .../dataset-edits`.

### Decision: Validate on commit (blur / Enter), not per keystroke

**Rationale**: Clarification session 2026-06-08 — avoids noisy errors while typing and matches spreadsheet UX.

**Chosen**: Web enters edit mode on click; API called only on commit; Escape cancels without API call.

### Decision: Server round-trip on each committed edit

**Rationale**: Keeps coercion and validation authoritative in core/API. Typical workbench sessions edit a handful of cells; full-dataset validation is acceptable for ≤500 records (006 performance baseline).

**Alternatives considered**:

- Debounced batch validate: deferred — adds sync complexity without spec requirement.
- Optimistic UI with background validate: rejected for v1 — risks showing stale validity.

**Chosen**: Synchronous commit → API → update dataset + `validationResults` in page state.

### Decision: Field editability matrix (v1)

| Field kind | Editable | UI |
| --- | --- | --- |
| `_id` | No | Read-only monospace + tooltip |
| Reference (`ref` / ObjectId link) | No | Read-only monospace + `ref` badge |
| String (no enum) | Yes | Inline text input |
| String (enum) | Yes | **Dropdown / select list only** — all reviewed enum values; no free-text primary control |
| Number | Yes | Inline number input |
| Boolean | Yes | Toggle or select |
| Date | Yes | ISO date text input |
| Array / Object / Mixed | No | JSON preview, read-only |

**Chosen**: Enforced in `applyCellEditToDataset`; table renders matching affordances (FR-015).

### Decision: Canvas-like UX without new layout

**Rationale**: User wants editing to feel like working on a canvas — simple and intuitive. The center **data canvas** from 006 remains the surface; no modals or separate edit screens (FR-014).

**UX patterns chosen**:

- Click cell → inline editor replaces display text.
- Subtle `ring` / background on focused cell.
- Committed edited cells: `border-l-2 border-accent` + small `Edited` dot/label (FR-016); cleared on save/reload.
- Enum edit mode: dropdown/select populated from `field.enum` (FR-018).
- Inline error text under cell (existing badge pattern, plain-language `message` not raw `code`).
- Collection tab invalid dot when collection has errors.
- Header chip: `N issues` linking to first error cell.

### Decision: Persistence via patch + save-as-new

**Rationale**: Saves **fork** new dataset versions via `forkSavedGeneratedDataset`; PATCH parent id + response `savedDatasetId`.

**Gap today**: `saveGeneratedDataset` exists; no `updateSavedGeneratedDataset` for dataset body.

**Chosen**:

- New core `updateSavedGeneratedDataset` (patch collections, status, validationResults, warnings).
- Reuse `saveGeneratedDataset` for save-as-new with `source: "manual_edit"` (extend `SavedGeneratedDatasetSource`).
- API `PATCH /projects/:projectId/generated-datasets/:datasetId` and existing POST save path for new runs.

### Decision: Export gating uses live validation state

**Rationale**: `export-drawer.tsx` already blocks when `dataset.status !== "valid"` or errors present. After edits, page must refresh `dataset.status` and `validationResults` from API response so export tracks edit-time validity (FR-004).

**Chosen**: No export-drawer rewrite — wire updated validation props from edit flow.

### Decision: Unsaved edits tracking in page state

**Rationale**: FR-008/FR-011 require unsaved indicator and navigate-away warning.

**Chosen**: `DatasetEditSession` tracks `baselineSnapshot` (last persisted or loaded run JSON hash) vs `currentDataset`; `beforeunload` + Next.js route guard in `page.tsx` (presentation only).

## References

- `packages/core/src/generation/validate-generated-dataset.ts`
- `apps/web/components/generation/collection-data-table.tsx`
- `apps/web/components/generation/export-drawer.tsx`
- `docs/ui-design.md` — layered cards, dense tables, soft dividers
- `docs/requirements.md` — Preview and Editing user stories
