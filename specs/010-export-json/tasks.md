# Tasks: Export Generated Data as JSON

**Input**: Design documents from `specs/010-export-json/`

**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/export-json-ui.md`, `quickstart.md`

**Tests**: This is a verification-only task list. Do not add or modify tests unless verification finds a real export gap.

**Organization**: Tasks are grouped by independently verifiable user story. All tasks are inspection or verification tasks unless explicitly marked as a contingency for a confirmed gap.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel with other `[P]` tasks when touching or inspecting different files.
- **[Story]**: Maps task to a user story from `spec.md`.
- Every task includes exact repository paths.

## Phase 1: Setup

**Purpose**: Confirm the feature is already implemented and prepare verification scope.

- [X] T001 Review the existing behavior assessment in `specs/010-export-json/spec.md`
- [X] T002 Review the verification-only constraints in `specs/010-export-json/plan.md`
- [X] T003 [P] Review the UI contract in `specs/010-export-json/contracts/export-json-ui.md`
- [X] T004 [P] Review manual verification steps in `specs/010-export-json/quickstart.md`

---

## Phase 2: Foundational Verification

**Purpose**: Verify shared export wiring and feature flag behavior before user-story checks.

- [X] T005 Verify `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT === "true"` controls export visibility in `apps/web/app/generate/page.tsx`
- [X] T006 Verify `showExport`, `exportOpen`, and `onExportOpenChange` are passed from `apps/web/app/generate/page.tsx` into `apps/web/components/generation/generation-workbench.tsx`
- [X] T007 Verify `apps/web/components/generation/generation-workbench.tsx` renders `ExportDrawer` only when export is enabled and an open-state handler exists
- [X] T008 Verify `apps/web/components/generation/generation-workbench.tsx` passes the active generated dataset and active validation results into `apps/web/components/generation/export-drawer.tsx`

**Checkpoint**: Feature flag and workbench mounting behavior are understood and verified.

---

## Phase 3: User Story 1 - Export Valid Dataset JSON (Priority: P1)

**Goal**: Verify a valid active generated dataset can be copied or downloaded as JSON grouped by collection.

**Independent Test**: Open the export surface with a valid generated dataset and confirm copy/download both provide grouped JSON.

### Verification Tasks

- [X] T009 [P] [US1] Verify `apps/web/components/generation/export-drawer.tsx` builds the JSON payload from `dataset.collections`
- [X] T010 [P] [US1] Verify `apps/web/components/generation/export-drawer.tsx` formats grouped JSON consistently for display, copy, and download
- [X] T011 [P] [US1] Verify copy JSON writes the grouped JSON payload through the clipboard action in `apps/web/components/generation/export-drawer.tsx`
- [X] T012 [P] [US1] Verify download JSON creates a JSON file from the grouped JSON payload in `apps/web/components/generation/export-drawer.tsx`
- [X] T013 [US1] Verify the exported JSON includes the same active dataset records and references shown in `apps/web/components/generation/generation-workbench.tsx`
- [X] T014 [US1] Record whether the target environment has JSON export enabled via `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT` in `.env` or deployment configuration documentation

**Checkpoint**: US1 is verified without code changes, or a real gap is documented before any implementation work is proposed.

---

## Phase 4: User Story 2 - Block Invalid Dataset Export (Priority: P1)

**Goal**: Verify invalid datasets cannot be copied or downloaded and validation errors remain visible.

**Independent Test**: Open the export surface with a dataset containing blocking validation errors and confirm copy/download are disabled while errors are shown.

### Verification Tasks

- [X] T015 [P] [US2] Verify `apps/web/components/generation/export-drawer.tsx` blocks export when `dataset` is missing
- [X] T016 [P] [US2] Verify `apps/web/components/generation/export-drawer.tsx` blocks export when `dataset.status` is not `valid`
- [X] T017 [P] [US2] Verify `apps/web/components/generation/export-drawer.tsx` blocks export when `validationResults` contains any blocking error
- [X] T018 [P] [US2] Verify copy JSON and download JSON buttons are disabled by the same invalid-state guard in `apps/web/components/generation/export-drawer.tsx`
- [X] T019 [US2] Verify `apps/web/components/generation/export-drawer.tsx` shows an export-unavailable message when export is blocked
- [X] T020 [US2] Verify `apps/web/components/generation/validation-summary.tsx` displays blocking validation errors passed from `apps/web/components/generation/generation-workbench.tsx`
- [X] T021 [US2] Verify non-blocking warnings do not block export unless the active dataset status or blocking validation results make export invalid in `apps/web/components/generation/export-drawer.tsx`

**Checkpoint**: US2 is verified without code changes, or a real gap is documented before any implementation work is proposed.

---

## Phase 5: Scope Regression Verification

**Purpose**: Confirm Export JSON verification did not create or require unrelated behavior changes.

- [X] T022 [P] Verify no task or plan instruction requires changes to feedback regeneration files under `packages/core/src/generation/regenerate-with-feedback.ts`, `apps/api/src/routes/generation.ts`, or `apps/web/app/generate/page.tsx` beyond export flag wiring inspection
- [X] T023 [P] Verify no task or plan instruction requires changes to direct seeding files under `apps/api/src/routes/history.ts`, `packages/core/src/projects/record-seed-batch.ts`, or related seed insertion behavior
- [X] T024 [P] Verify no task or plan instruction requires changes to rollback files under `apps/api/src/routes/rollback.ts` or `packages/core/src/projects/rollback-seed-batch.ts`
- [X] T025 [P] Verify no task or plan instruction requires changes to preview editing files under `apps/web/components/generation/collection-data-table.tsx`, `apps/web/components/generation/editable-table-cell.tsx`, or `packages/core/src/generation/apply-cell-edit-to-dataset.ts`

---

## Phase 6: Final Verification and Reporting

**Purpose**: Record the verification result and avoid implementation work unless a real gap is found.

- [X] T026 Run `npx.cmd turbo build lint test` from the repository root and record the result in `specs/010-export-json/tasks.md`
- [X] T027 If all verification tasks pass, record in `specs/010-export-json/tasks.md` that the sheet row should be marked Completed
- [X] T028 If a real export gap is found, document the gap in `specs/010-export-json/tasks.md` and stop before adding implementation tasks
- [X] T029 Confirm `specs/010-export-json/tasks.md` contains no implementation tasks for export, feedback regeneration, direct seeding, rollback, or preview editing unless T028 documents a real gap

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational Verification)**: Depends on Phase 1.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2.
- **Phase 5 (Scope Regression Verification)**: Can run after Phase 1, but final confirmation is clearest after US1 and US2 verification.
- **Phase 6 (Final Verification and Reporting)**: Depends on all verification phases.

### User Story Dependencies

- **US1 (P1)** and **US2 (P1)** are independently verifiable after feature flag and workbench mounting checks.
- No story depends on implementing new behavior.

### Parallel Opportunities

- T003 and T004 can run in parallel.
- T009 through T012 can run in parallel during US1 verification.
- T015 through T018 can run in parallel during US2 verification.
- T022 through T025 can run in parallel during scope regression verification.

---

## Parallel Example: User Story 1

```bash
Task: "Verify apps/web/components/generation/export-drawer.tsx builds the JSON payload from dataset.collections"
Task: "Verify apps/web/components/generation/export-drawer.tsx implements copy JSON with the grouped JSON payload"
Task: "Verify apps/web/components/generation/export-drawer.tsx implements download JSON with the grouped JSON payload"
```

---

## Parallel Example: User Story 2

```bash
Task: "Verify apps/web/components/generation/export-drawer.tsx blocks export when dataset.status is not valid"
Task: "Verify apps/web/components/generation/export-drawer.tsx blocks export when validationResults contains any blocking error"
Task: "Verify apps/web/components/generation/validation-summary.tsx displays blocking validation errors"
```

---

## Implementation Strategy

### Verification First

1. Complete setup and foundational verification.
2. Verify valid-dataset export behavior.
3. Verify invalid-dataset export blocking.
4. Verify scope boundaries.
5. Mark the sheet row Completed if no real gap is found.

### Contingency

If verification finds a real Export JSON gap, stop and document the gap before generating implementation tasks. Do not modify feedback regeneration, direct seeding, rollback, or preview editing for this feature.

## Notes

- Latest code analysis indicates Export JSON is already implemented.
- The export UI is feature-flagged; disabled configuration is not an implementation gap by itself.
- Do not implement new export behavior unless verification proves a real gap.
