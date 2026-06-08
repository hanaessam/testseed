# Tasks: Preview and Editing

**Input**: Design documents from `specs/007-preview-editing/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Core unit tests and API contract tests per `plan.md` (not full UI TDD unless noted).

**Organization**: Phases follow user story priorities (US1–US6). Foundational layer delivers `applyCellEditToDataset` + `POST /dataset-edits` before canvas UI.

**Branch**: `007-preview-editing`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies).
- **[Story]**: Maps to user stories in `spec.md` (US1–US6).
- Every task includes exact file paths.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm feature context and contract alignment before code changes.

- [X] T001 Verify active feature directory `specs/007-preview-editing` and branch `007-preview-editing` per `.specify/feature.json`
- [X] T002 [P] Read and confirm `specs/007-preview-editing/contracts/dataset-edit-api.md` against planned `POST /dataset-edits` shape
- [X] T003 [P] Read and confirm `specs/007-preview-editing/contracts/saved-dataset-patch-api.md` against planned `PATCH` and `manual_edit` save flow

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, core cell-edit use case, dataset-edit API, and web client method — **blocks all user stories**.

**CRITICAL**: No user story UI work until this phase completes.

- [X] T004 Add `DatasetCellEdit`, `DatasetCellEditRequest`, `DatasetCellEditResponse`, and extend `SavedGeneratedDatasetSource` with `manual_edit` in `packages/types/src/generation.ts`
- [X] T005 Export new generation types from `packages/types/src/index.ts`
- [X] T006 Implement field editability rules (`_id`, `ref`, nested types) in `packages/core/src/generation/field-editability.ts`
- [X] T007 Implement `applyCellEditToDataset` (coerce `rawValue`, immutable update, call `validateGeneratedDataset`) in `packages/core/src/generation/apply-cell-edit-to-dataset.ts`
- [X] T008 [P] Add unit tests for editability, coercion, enum, unique, and reference revalidation in `packages/core/src/generation/__tests__/apply-cell-edit-to-dataset.test.ts`
- [X] T009 Export `applyCellEditToDataset` and `isFieldEditable` from `packages/core/src/generation/index.ts`
- [X] T010 Implement `POST /projects/:projectId/dataset-edits` with Zod body validation in `apps/api/src/routes/generation.ts` per `contracts/dataset-edit-api.md`
- [X] T011 [P] Add contract tests for dataset-edit success, `FIELD_NOT_EDITABLE`, and auth errors in `apps/api/src/routes/__tests__/dataset-edit.contracts.test.ts`
- [X] T012 Add `applyDatasetCellEdit` function in `apps/web/src/lib/api-client.ts`

**Checkpoint**: Committed cell edit round-trips through API with full-dataset validation.

---

## Phase 3: User Story 1 — Canvas-Like Inline Editing (Priority: P1) MVP

**Goal**: Click editable cells on the data canvas; commit in place; Escape cancels; edited indicator visible.

**Independent Test**: Load dataset → click scalar cell → change value → commit without modals; Escape reverts in-progress edit.

### Implementation for User Story 1

- [X] T013 [P] [US1] Create presentational `EditableTableCell` with display/edit modes in `apps/web/components/generation/editable-table-cell.tsx`
- [X] T014 [US1] Add click-to-edit, blur/Enter commit, and Escape cancel wiring in `apps/web/components/generation/editable-table-cell.tsx`
- [X] T015 [US1] Integrate `EditableTableCell` into table body in `apps/web/components/generation/collection-data-table.tsx`
- [X] T016 [US1] Add editable affordances (`cursor-text`, hover `bg-accent/5`, focus ring) in `apps/web/components/generation/editable-table-cell.tsx`
- [X] T017 [US1] Implement edited-state indicator (`border-l-2 border-accent` + small `Edited` label) in `apps/web/components/generation/collection-data-table.tsx`
- [X] T018 [US1] Track `lastEditedCells` and `hasUnsavedEdits` baseline in `apps/web/app/generate/page.tsx` per `specs/007-preview-editing/data-model.md`
- [X] T019 [US1] Wire `onCellCommit` from `apps/web/app/generate/page.tsx` through `apps/web/components/generation/generation-workbench.tsx` to `collection-data-table.tsx`
- [X] T020 [US1] Pass `editingDisabled` during generation/refinement from `apps/web/app/generate/page.tsx` to `apps/web/components/generation/generation-workbench.tsx`

**Checkpoint**: User Story 1 MVP — canvas edit flow works end-to-end with API commit.

---

## Phase 4: User Story 2 — Schema Revalidation on Edit (Priority: P1)

**Goal**: Every committed edit revalidates; inline plain-language errors; enum fields use dropdown only.

**Independent Test**: Set invalid enum via API path → inline error; pick valid enum from dropdown → error clears.

### Implementation for User Story 2

- [X] T021 [US2] Replace validation code badges with plain-language `message` under cells in `apps/web/components/generation/collection-data-table.tsx`
- [X] T022 [US2] Render enum fields as shadcn `Select` or native `<select>` listing `field.enum` in `apps/web/components/generation/editable-table-cell.tsx`
- [X] T023 [US2] Update `dataset`, `validationResults`, `warnings`, and `dataset.status` from API response on commit in `apps/web/app/generate/page.tsx`
- [X] T024 [P] [US2] Add enum-only and type-mismatch test cases in `packages/core/src/generation/__tests__/apply-cell-edit-to-dataset.test.ts`
- [X] T025 [US2] Ensure uniqueness errors surface on both conflicting rows in `apps/web/components/generation/collection-data-table.tsx`

**Checkpoint**: Revalidation feedback appears on same commit interaction (SC-005).

---

## Phase 5: User Story 3 — Block Export and Insertion When Invalid (Priority: P1)

**Goal**: Export disabled while validation errors exist; issue count visible; fix re-enables export.

**Independent Test**: Introduce edit error → Export JSON disabled → fix cell → export enabled.

### Implementation for User Story 3

- [X] T026 [US3] Pass live `validationResults` and `dataset.status` to `ExportDrawer` after edits in `apps/web/app/generate/page.tsx`
- [X] T027 [US3] Add dataset validation issue count chip in workbench header in `apps/web/components/generation/generation-workbench.tsx`
- [X] T028 [US3] Disable export actions when `validationResults` contains `severity: "error"` in `apps/web/components/generation/export-drawer.tsx`
- [X] T029 [P] [US3] Create `validation-summary.tsx` with list of issues and collection/field labels in `apps/web/components/generation/validation-summary.tsx`

**Checkpoint**: Export blocking tracks edit-time validity (FR-004).

---

## Phase 6: User Story 4 — Read-Only Identifier and Reference Fields (Priority: P2)

**Goal**: `_id` and reference columns not editable; tooltip explains why.

**Independent Test**: `_id` and ref cells are not enterable; scalar columns on same row remain editable.

### Implementation for User Story 4

- [X] T030 [US4] Use `isFieldEditable` (via column metadata from schema) to skip edit mode for `_id` and `ref` fields in `apps/web/components/generation/collection-data-table.tsx`
- [X] T031 [US4] Style read-only cells (muted background, `cursor-not-allowed`) in `apps/web/components/generation/editable-table-cell.tsx`
- [X] T032 [US4] Add hover/focus tooltip explaining link preservation for read-only fields in `apps/web/components/generation/editable-table-cell.tsx`
- [X] T033 [P] [US4] Return `422 FIELD_NOT_EDITABLE` from API when edit targets non-editable field in `apps/api/src/routes/generation.ts`

**Checkpoint**: Referential integrity protected from casual edits (FR-006).

---

## Phase 7: User Story 5 — Persist Edited Datasets (Priority: P2)

**Goal**: Save to active run, save as new, first Save after generate creates run; block save when invalid.

**Independent Test**: Edit → Save → reload run shows new value; Save as new creates second list entry.

### Implementation for User Story 5

- [X] T034 Implement `updateSavedGeneratedDataset` with valid-dataset gate in `packages/core/src/generation/update-saved-generated-dataset.ts`
- [X] T035 [P] Add unit tests for patch success and invalid-dataset rejection in `packages/core/src/generation/__tests__/update-saved-generated-dataset.test.ts`
- [X] T036 Add `updateGeneratedDatasetRecord` in `packages/db/src/repositories/generated-dataset-repository.ts`
- [X] T037 Export `updateSavedGeneratedDataset` from `packages/core/src/generation/index.ts`
- [X] T038 Implement `PATCH /projects/:projectId/generated-datasets/:datasetId` in `apps/api/src/routes/generation.ts` per `contracts/saved-dataset-patch-api.md`
- [X] T039 [P] Add contract tests for PATCH success and `422` invalid dataset in `apps/api/src/routes/__tests__/saved-dataset-patch.contracts.test.ts`
- [X] T040 Extend `POST /projects/:projectId/generated-datasets` to accept `source: "manual_edit"` in `apps/api/src/routes/generation.ts`
- [X] T041 [P] Add `patchSavedGeneratedDataset` and `saveManualEditDataset` in `apps/web/src/lib/api-client.ts`
- [X] T042 [US5] Create `dataset-save-bar.tsx` with Save, Save as new, and unsaved chip in `apps/web/components/generation/dataset-save-bar.tsx`
- [X] T043 [US5] Mount save bar and wire Save vs Save-as-new (first save → POST) in `apps/web/components/generation/generation-workbench.tsx`
- [X] T044 [US5] Block save actions when dataset invalid (reuse validation summary) in `apps/web/components/generation/dataset-save-bar.tsx`
- [X] T045 [US5] Reset `baselineFingerprint` and `activeSavedDatasetId` after successful save in `apps/web/app/generate/page.tsx`
- [X] T046 [US5] Add `beforeunload` and in-app route-change confirm when `hasUnsavedEdits` in `apps/web/app/generate/page.tsx`

**Checkpoint**: Persistence loop complete (FR-007, FR-008, FR-011; SC-004).

---

## Phase 8: User Story 6 — Validation Feedback in Preview (Priority: P3)

**Goal**: Collection tabs and header reflect invalid state; error count without opening every tab.

**Independent Test**: Edit to invalid → collection tab shows invalid state → fix → returns to valid.

### Implementation for User Story 6

- [X] T047 [US6] Show invalid/warning dot on collection tabs with errors in `apps/web/components/generation/collection-data-table.tsx`
- [X] T048 [US6] Sync dataset-level valid/invalid badge with `validationResults` in `apps/web/components/generation/generation-workbench.tsx`
- [X] T049 [US6] Wire validation summary “jump to cell” to switch tab and scroll row in `apps/web/components/generation/validation-summary.tsx`

**Checkpoint**: Aggregated validation chrome matches per-cell errors (User Story 6).

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Optional revalidate endpoint, docs, and quality gate.

- [X] T050 [P] Implement optional `POST /projects/:projectId/datasets/validate` in `apps/api/src/routes/generation.ts` for schema-reload edge case
- [X] T051 [P] Update `docs/generation-ux-roadmap.md` to mark 007 in progress/complete when shipped
- [X] T052 [P] Append 007 completion note to `docs/ai-assisted-tooling.md` changelog
- [X] T053 Run manual checklist in `specs/007-preview-editing/quickstart.md`
- [X] T054 Run `npx turbo build lint test` from repository root

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**.
- **US1 (Phase 3)**: Depends on Foundational (T012 api-client + API).
- **US2 (Phase 4)**: Depends on US1 commit wiring (T019).
- **US3 (Phase 5)**: Depends on US2 live `validationResults` (T023).
- **US4 (Phase 6)**: Can start after T015 (table integration); parallel with US2/US3 if coordinated.
- **US5 (Phase 7)**: Depends on US2 valid dataset state; needs Foundational types only for core/db.
- **US6 (Phase 8)**: Depends on US3 validation summary (T029).
- **Polish (Phase 9)**: Depends on desired user stories complete.

### User Story Dependencies

| Story | Depends on | Independent test |
| --- | --- | --- |
| US1 | Foundational | Click-edit-commit on canvas |
| US2 | US1 commit path | Inline errors + enum dropdown |
| US3 | US2 validation state | Export blocked/enabled |
| US4 | US1 table cells | Read-only `_id`/refs |
| US5 | US2 valid saves | Save / reload persistence |
| US6 | US3 summary | Tab/header invalid badges |

### Parallel Opportunities

- **Phase 1**: T002 ∥ T003
- **Phase 2**: T008 ∥ T011 after T007/T010 respectively; T004–T005 sequential first
- **Phase 3**: T013 parallel with T018 prep once T012 done
- **Phase 4**: T024 ∥ T021–T023
- **Phase 5**: T029 ∥ T026–T028
- **Phase 6**: T033 ∥ T030–T032
- **Phase 7**: T035 ∥ T039; T041 ∥ T042 after T038/T040
- **Phase 9**: T050 ∥ T051 ∥ T052

### Parallel Example: Foundational

```bash
# After T007 lands:
Task T008: "Unit tests in packages/core/src/generation/__tests__/apply-cell-edit-to-dataset.test.ts"
Task T010: "POST dataset-edits in apps/api/src/routes/generation.ts"
# Then T011 contract tests after T010
```

### Parallel Example: User Story 1

```bash
Task T013: "Create editable-table-cell.tsx"
Task T018: "Track lastEditedCells in apps/web/app/generate/page.tsx"
# Then T015 integrates T013 into collection-data-table.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 + Foundational)

1. Complete Phase 1–2 (types, core, API, api-client).
2. Complete Phase 3 (US1 canvas editing).
3. **STOP and VALIDATE**: `quickstart.md` steps 4–7 (edit, indicator, Escape).
4. Add US2 → US3 for export gate before persist.

### Incremental Delivery

1. Foundational + US1 + US2 + US3 → editable, validated, export-safe dataset.
2. US4 → read-only hardening.
3. US5 → persistence and unsaved warnings.
4. US6 + Polish → navigation and docs.

### Suggested MVP Scope

**Minimum shippable slice**: Phases 1–5 (through US3) — users can edit, see validation, and export gate works. Persistence (US5) is the next increment.

---

## Notes

- Do not import `@testseed/core` in `apps/web`; all coercion/validation via API.
- Enum fields: dropdown only (FR-018), no free-text primary control.
- Edited indicator: accent left border + `Edited` label (FR-016).
- Commit triggers validation; Escape does not call API.
- Align UI with `docs/ui-design.md` (soft borders, dense tables).
