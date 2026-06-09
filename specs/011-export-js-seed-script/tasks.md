# Tasks: Export JavaScript Seed Script

**Input**: Design documents from `specs/011-export-js-seed-script/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/export-js-seed-script-core.md](./contracts/export-js-seed-script-core.md), [quickstart.md](./quickstart.md)

**Tests**: Required. The plan requires Jest coverage for the exported core behavior, and implementation should follow test-first order inside each user story.

**Organization**: Tasks are grouped by user story so each story remains independently testable. Scope is core-only.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches a different file or does not depend on incomplete implementation
- **[Story]**: Maps to a user story from [spec.md](./spec.md)
- Every task includes an exact file path

## Phase 1: Setup

**Purpose**: Confirm current core contracts and validation helpers before adding the export use case.

- [X] T001 Review existing generation dataset, validation, and schema types in `packages/types/src/generation.ts` and `packages/types/src/schema.ts`
- [X] T002 Review existing validation and reference error behavior in `packages/core/src/generation/validate-generated-dataset.ts`
- [X] T003 Review existing generation ordering behavior in `packages/core/src/generation/build-generation-plan.ts`

---

## Phase 2: Foundational

**Purpose**: Add shared contracts and core module surface that all stories depend on.

**CRITICAL**: No user story implementation should begin until these shared contracts are in place.

- [X] T004 Add exported JavaScript seed script result, request, error code, and error detail types in `packages/types/src/generation.ts`
- [X] T005 Create the `ExportJsSeedScriptError` class and exported function skeleton in `packages/core/src/generation/export-js-seed-script.ts`
- [X] T006 Export `exportJsSeedScript`, `ExportJsSeedScriptError`, and related core-local types from `packages/core/src/generation/index.ts`

**Checkpoint**: Core contract and module entry point exist; user story tests can now target the exported function.

---

## Phase 3: User Story 1 - Generate Ready-to-Run Seed Script (Priority: P1) MVP

**Goal**: Generate a deterministic, readable CommonJS MongoDB seed script from a valid generated dataset.

**Independent Test**: A valid dataset returns script text containing MongoDB native driver setup, `MONGODB_URI` guidance and runtime guard, grouped records, insert calls, setup comments, and `ObjectId(...)` literals for `_id` and ObjectId reference fields.

### Tests for User Story 1

- [X] T007 [US1] Add Jest fixtures for valid parsed schema and generated dataset with ObjectId `_id` and reference fields in `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`
- [X] T008 [US1] Add failing Jest test for ready-to-run CommonJS MongoDB script rendering with `require("mongodb")`, `MongoClient`, `ObjectId`, insert calls, and readable setup comments in `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`
- [X] T009 [US1] Add failing Jest test for `MONGODB_URI` setup comment and runtime guard in `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`
- [X] T010 [US1] Add failing Jest test for `_id` and ObjectId reference fields rendered as `ObjectId("...")` instead of plain strings in `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`
- [X] T011 [US1] Add failing Jest test proving identical valid input produces byte-for-byte deterministic script output in `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`

### Implementation for User Story 1

- [X] T012 [US1] Implement valid dataset presence checks and successful result shape in `packages/core/src/generation/export-js-seed-script.ts`
- [X] T013 [US1] Implement readable CommonJS script rendering with MongoDB native driver require statements, async `main`, connection close handling, and collection `insertMany` calls in `packages/core/src/generation/export-js-seed-script.ts`
- [X] T014 [US1] Implement `MONGODB_URI` setup comments and runtime guard inside the generated script text in `packages/core/src/generation/export-js-seed-script.ts`
- [X] T015 [US1] Implement deterministic JavaScript literal serialization with stable collection, record, and field ordering in `packages/core/src/generation/export-js-seed-script.ts`
- [X] T016 [US1] Implement ObjectId conversion for generated `_id` fields and schema ObjectId reference fields in `packages/core/src/generation/export-js-seed-script.ts`

**Checkpoint**: User Story 1 returns a ready-to-run deterministic script for valid input and passes focused US1 tests.

---

## Phase 4: User Story 2 - Preserve Dependency Order (Priority: P1)

**Goal**: Insert records by collection in dependency order using the accepted dataset generation order.

**Independent Test**: A parent/child dataset with `dataset.generationOrder` returns script sections and insert calls in that exact safe order.

### Tests for User Story 2

- [X] T017 [US2] Add failing Jest test proving parent collection inserts appear before child collection inserts according to `dataset.generationOrder` in `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`
- [X] T018 [US2] Add failing Jest test proving `orderedCollections` in the result matches `dataset.generationOrder` for exported collections in `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`

### Implementation for User Story 2

- [X] T019 [US2] Implement collection insertion ordering from `dataset.generationOrder` while omitting empty or absent collection groups in `packages/core/src/generation/export-js-seed-script.ts`
- [X] T020 [US2] Add unsafe order rejection when non-empty dataset collections cannot be represented by `dataset.generationOrder` in `packages/core/src/generation/export-js-seed-script.ts`

**Checkpoint**: User Story 2 preserves dependency-order insertion independently of UI or API behavior.

---

## Phase 5: User Story 3 - Block Scripts With Unresolved References (Priority: P1)

**Goal**: Refuse script generation when validation finds unresolved references or any other blocking validation error.

**Independent Test**: Invalid datasets return a clear typed export error, do not return script text, include validation details, and specifically categorize `REFERENCE_NOT_FOUND` as an unresolved reference blocker.

### Tests for User Story 3

- [X] T021 [US3] Add failing Jest test proving datasets with `REFERENCE_NOT_FOUND` validation results throw or return `SCRIPT_EXPORT_UNRESOLVED_REFERENCE` with no script in `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`
- [X] T022 [US3] Add failing Jest test proving non-reference validation errors block script generation with `SCRIPT_EXPORT_VALIDATION_FAILED` in `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`
- [X] T023 [US3] Add failing Jest test proving missing or empty datasets block script generation with `SCRIPT_EXPORT_DATASET_EMPTY` in `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`

### Implementation for User Story 3

- [X] T024 [US3] Call existing `validateGeneratedDataset` before rendering script output in `packages/core/src/generation/export-js-seed-script.ts`
- [X] T025 [US3] Implement blocking validation error detection and preserve validation details on `ExportJsSeedScriptError` in `packages/core/src/generation/export-js-seed-script.ts`
- [X] T026 [US3] Implement specific unresolved reference handling for `REFERENCE_NOT_FOUND` with clear developer-facing error message in `packages/core/src/generation/export-js-seed-script.ts`
- [X] T027 [US3] Ensure no partial script is returned when any export-blocking validation error occurs in `packages/core/src/generation/export-js-seed-script.ts`

**Checkpoint**: User Story 3 blocks invalid exports and reports clear typed errors.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify full feature behavior, scope boundaries, and monorepo health.

- [X] T028 Run focused core tests for `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`
- [X] T029 Verify no implementation changes were made outside `packages/types/src/generation.ts`, `packages/core/src/generation/export-js-seed-script.ts`, `packages/core/src/generation/index.ts`, and `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`
- [X] T030 Verify generated scripts contain no drop, delete, cleanup, direct seeding, rollback, JSON export, feedback regeneration, API route, or web UI behavior in `packages/core/src/generation/export-js-seed-script.ts`
- [X] T031 Run final monorepo verification with `npx.cmd turbo build lint test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **User Stories (Phases 3-5)**: Depend on Foundational. All are P1; implement US1 first for MVP script output, then US2 and US3 to satisfy dependency ordering and safety.
- **Polish (Phase 6)**: Depends on all selected user stories.

### User Story Dependencies

- **US1 Generate Ready-to-Run Seed Script**: Starts after Foundational; no dependency on US2 or US3.
- **US2 Preserve Dependency Order**: Starts after Foundational; integrates into the renderer from US1 but can be verified with order-specific tests.
- **US3 Block Scripts With Unresolved References**: Starts after Foundational; integrates validation before the renderer and can be verified independently with invalid datasets.

### Within Each User Story

- Write story-specific Jest tests before implementation.
- Implement the smallest core behavior needed to pass those tests.
- Run focused Jest tests at each checkpoint before moving to the next story.

---

## Parallel Opportunities

- T001, T002, and T003 can be reviewed in parallel.
- T007 through T011 can be drafted together before US1 implementation because they share one test file but cover separate assertions.
- T017 and T018 can be drafted together before US2 implementation.
- T021 through T023 can be drafted together before US3 implementation.
- After T004 through T006, US2 and US3 test-writing can begin while US1 implementation proceeds, but implementation edits in `export-js-seed-script.ts` should be serialized.

## Parallel Example: User Story 1

```text
Task: "Add failing Jest test for ready-to-run CommonJS MongoDB script rendering with `require(\"mongodb\")`, `MongoClient`, `ObjectId`, insert calls, and readable setup comments in `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`"
Task: "Add failing Jest test for `_id` and ObjectId reference fields rendered as `ObjectId(\"...\")` instead of plain strings in `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`"
Task: "Add failing Jest test proving identical valid input produces byte-for-byte deterministic script output in `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`"
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational tasks.
2. Complete US1 to generate a deterministic ready-to-run script from valid data.
3. Stop and run focused tests for US1.

### Complete Core Feature

1. Add US2 ordering behavior from `dataset.generationOrder`.
2. Add US3 validation blocking, including `REFERENCE_NOT_FOUND`.
3. Run focused core tests.
4. Run `npx.cmd turbo build lint test`.

### Scope Discipline

Keep all implementation inside the expected core area:

- `packages/types/src/generation.ts`
- `packages/core/src/generation/export-js-seed-script.ts`
- `packages/core/src/generation/index.ts`
- `packages/core/src/generation/__tests__/export-js-seed-script.test.ts`

Do not change web UI, API routes, direct seeding, rollback, JSON export, feedback regeneration, or preview editing unless a task explicitly gets revised after a real blocking gap is discovered.
