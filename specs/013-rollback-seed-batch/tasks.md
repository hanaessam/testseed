# Tasks: Rollback Seed Batch

**Input**: Design documents from `specs/013-rollback-seed-batch/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/rollback-seed-batch.md](./contracts/rollback-seed-batch.md), [quickstart.md](./quickstart.md)

**Tests**: Test tasks are included because the plan requires test-first coverage for rollback safety, reverse order, partial failure, metadata updates, API adapter behavior, and connection closure.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the active rollback feature context and current source structure before changing contracts.

- [X] T001 Confirm `AGENTS.md` references `specs/013-rollback-seed-batch/plan.md`
- [X] T002 [P] Review existing rollback implementation in `packages/core/src/projects/rollback-seed-batch.ts`
- [X] T003 [P] Review existing rollback route adapter in `apps/api/src/routes/rollback.ts`
- [X] T004 [P] Review existing seed batch persistence in `packages/db/src/models/seed-batch.ts` and `packages/db/src/repositories/project-history-repository.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared contracts and metadata support required by all rollback stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Add `collectionOrder`, `rollbackDeletedCounts`, rollback report, rollback collection result, and rollback error types in `packages/types/src/projects.ts`
- [X] T006 Verify updated rollback and seed batch types are exported from `packages/types/src/index.ts`
- [X] T007 Update `SeedBatch` schema fields for `collectionOrder` and `rollbackDeletedCounts` in `packages/db/src/models/seed-batch.ts`
- [X] T008 Update `RecordSeedBatchInput`, `recordSeedBatch`, `toSeedBatch`, and `markSeedBatchRolledBack` signatures in `packages/db/src/repositories/project-history-repository.ts`
- [X] T009 Update seed batch record input contracts in `packages/core/src/projects/record-seed-batch.ts`
- [X] T010 Update direct seeding batch recording to provide original generation order in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [X] T011 Update existing direct seeding tests for `collectionOrder` persistence inputs in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [X] T012 Run type-focused checks for foundational contract changes with `npm --workspace @testseed/types test`, `npm --workspace @testseed/db run lint`, and `npm --workspace @testseed/core test`

**Checkpoint**: Seed batch metadata supports rollback status, deleted counts, and explicit collection order.

---

## Phase 3: User Story 1 - Roll Back a Seed Batch (Priority: P1) MVP

**Goal**: A developer can provide a valid seedBatchId, delete records tagged with that batch, and receive a structured deleted-count report.

**Independent Test**: Prepare a seed batch with tagged records and other-batch records, run rollback, then confirm only the requested `seedBatchId` is used for deletion and the report includes counts by collection.

### Tests for User Story 1

> Write these tests first and ensure they fail before implementation.

- [X] T013 [P] [US1] Add successful rollback report test in `packages/core/src/projects/__tests__/rollback-seed-batch.test.ts`
- [X] T014 [P] [US1] Add tag-scoped deletion dependency test in `packages/core/src/projects/__tests__/rollback-seed-batch.test.ts`
- [X] T015 [P] [US1] Add API success contract test for response shape in `apps/api/src/routes/__tests__/rollback.contracts.test.ts`

### Implementation for User Story 1

- [X] T016 [US1] Implement `RollbackSeedBatchReport`, success result, and sanitized error helpers in `packages/core/src/projects/rollback-seed-batch.ts`
- [X] T017 [US1] Replace `_id`-based deletion dependency with `deleteRecordsBySeedBatchId` in `packages/core/src/projects/rollback-seed-batch.ts`
- [X] T018 [US1] Mark seed batch rolled back with deleted counts and append safe `rollback_completed` project event in `packages/core/src/projects/rollback-seed-batch.ts`
- [X] T019 [US1] Update rollback route response mapping to return the core report in `apps/api/src/routes/rollback.ts`
- [X] T020 [US1] Update rollback deletion adapter to use MongoDB native-driver `deleteMany({ seedBatchId })` per collection in `apps/api/src/routes/rollback.ts`
- [X] T021 [US1] Verify rollback adapter does not use Mongoose document models or `_id`-only deletion in `apps/api/src/routes/rollback.ts`
- [X] T022 [US1] Export rollback use case and result types through `packages/core/src/projects/index.ts` and `packages/core/src/index.ts`
- [X] T023 [US1] Run `npm --workspace @testseed/core test` and `npm --workspace @testseed/api test` for rollback success behavior

**Checkpoint**: User Story 1 is independently functional and returns a structured rollback report.

---

## Phase 4: User Story 2 - Preserve Dependency Safety During Rollback (Priority: P1)

**Goal**: Rollback processes collections in the reverse of the original generation/insertion order.

**Independent Test**: Use a batch with `collectionOrder` such as `["users", "orders", "orderItems"]`, run rollback, and confirm attempted deletion order is `["orderItems", "orders", "users"]`.

### Tests for User Story 2

> Write these tests first and ensure they fail before implementation.

- [X] T024 [P] [US2] Add reverse collection order core test in `packages/core/src/projects/__tests__/rollback-seed-batch.test.ts`
- [X] T025 [P] [US2] Add processed order report test in `packages/core/src/projects/__tests__/rollback-seed-batch.test.ts`

### Implementation for User Story 2

- [X] T026 [US2] Derive rollback order from `batch.collectionOrder` reversed in `packages/core/src/projects/rollback-seed-batch.ts`
- [X] T027 [US2] Include `processedOrder` and completed collection order in rollback reports from `packages/core/src/projects/rollback-seed-batch.ts`
- [X] T028 [US2] Ensure API adapter preserves core collection order without reordering in `apps/api/src/routes/rollback.ts`
- [X] T029 [US2] Run `npm --workspace @testseed/core test` for reverse-order rollback behavior

**Checkpoint**: User Story 2 is independently testable with multi-collection batch ordering.

---

## Phase 5: User Story 3 - Reject Unsafe or Duplicate Rollback (Priority: P1)

**Goal**: Missing, invalid, unknown, already rolled back, and empty/no-record batches are rejected before delete operations.

**Independent Test**: Call rollback with each invalid state and confirm a typed/sanitized error is returned, no delete dependency is invoked, and no unrelated data can be deleted.

### Tests for User Story 3

> Write these tests first and ensure they fail before implementation.

- [X] T030 [P] [US3] Add missing, empty, and whitespace seedBatchId rejection tests in `packages/core/src/projects/__tests__/rollback-seed-batch.test.ts`
- [X] T031 [P] [US3] Add invalid-format and unknown-batch rejection tests in `packages/core/src/projects/__tests__/rollback-seed-batch.test.ts`
- [X] T032 [P] [US3] Add already-rolled-back and no-record batch rejection tests in `packages/core/src/projects/__tests__/rollback-seed-batch.test.ts`
- [X] T033 [P] [US3] Add API request validation and sanitized error mapping tests in `apps/api/src/routes/__tests__/rollback.contracts.test.ts`

### Implementation for User Story 3

- [X] T034 [US3] Implement seedBatchId trim and direct-seeding-format validation in `packages/core/src/projects/rollback-seed-batch.ts`
- [X] T035 [US3] Implement unknown, already rolled back, pending, and no-record eligibility checks before deletion in `packages/core/src/projects/rollback-seed-batch.ts`
- [X] T036 [US3] Implement typed rollback error-to-HTTP mapping in `apps/api/src/routes/rollback.ts`
- [X] T037 [US3] Ensure rollback route closes transient MongoDB connections in success, failure, and rejection-after-open paths in `apps/api/src/routes/rollback.ts`
- [X] T038 [US3] Verify no rollback report, error, event payload, or metadata includes `mongoUri` in `packages/core/src/projects/rollback-seed-batch.ts` and `apps/api/src/routes/rollback.ts`
- [X] T039 [US3] Run `npm --workspace @testseed/core test` and `npm --workspace @testseed/api test` for rejection and connection-closure behavior

**Checkpoint**: User Story 3 is independently functional and blocks unsafe destructive operations.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, documentation, and full quality gate.

- [X] T040 [P] Update `specs/013-rollback-seed-batch/quickstart.md` if implementation commands or manual verification steps changed
- [X] T041 [P] Update `specs/013-rollback-seed-batch/contracts/rollback-seed-batch.md` if final core/API response shapes differ from the planned contract
- [X] T042 Review dependency direction and remove any accidental cross-package imports in `packages/types`, `packages/db`, `packages/core`, `apps/api`, and `apps/web`
- [X] T043 Run `npx turbo build lint test` from repository root
- [X] T044 Document any remaining known issue from `npx turbo build lint test` in `specs/013-rollback-seed-batch/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; MVP path.
- **User Story 2 (Phase 4)**: Depends on Foundational; can run after or alongside US1 once shared contracts exist.
- **User Story 3 (Phase 5)**: Depends on Foundational; can run after or alongside US1/US2 once shared contracts exist.
- **Polish (Phase 6)**: Depends on all desired user stories.

### User Story Dependencies

- **US1 - Roll Back a Seed Batch**: MVP; no dependency on US2/US3 after Foundational.
- **US2 - Preserve Dependency Safety During Rollback**: Uses shared `collectionOrder`; no dependency on US1 implementation if core report contract exists.
- **US3 - Reject Unsafe or Duplicate Rollback**: Uses shared rollback error model; no dependency on US2.

### Within Each User Story

- Tests must be written and fail before implementation.
- Shared types and persistence fields must exist before core implementation.
- Core use case changes must precede API route response mapping.
- Adapter deletion and connection management must stay in `apps/api`.
- Story checkpoint validation should run before moving to final polish.

---

## Parallel Opportunities

- T002, T003, and T004 can run in parallel.
- T013, T014, and T015 can be written in parallel after Foundational.
- T024 and T025 can be written in parallel after Foundational.
- T030, T031, T032, and T033 can be written in parallel after Foundational.
- T040 and T041 can run in parallel during polish.

---

## Parallel Example: User Story 1

```text
Task: "T013 [P] [US1] Add successful rollback report test in packages/core/src/projects/__tests__/rollback-seed-batch.test.ts"
Task: "T014 [P] [US1] Add tag-scoped deletion dependency test in packages/core/src/projects/__tests__/rollback-seed-batch.test.ts"
Task: "T015 [P] [US1] Add API success contract test for response shape in apps/api/src/routes/__tests__/rollback.contracts.test.ts"
```

## Parallel Example: User Story 3

```text
Task: "T030 [P] [US3] Add missing, empty, and whitespace seedBatchId rejection tests in packages/core/src/projects/__tests__/rollback-seed-batch.test.ts"
Task: "T031 [P] [US3] Add invalid-format and unknown-batch rejection tests in packages/core/src/projects/__tests__/rollback-seed-batch.test.ts"
Task: "T032 [P] [US3] Add already-rolled-back and no-record batch rejection tests in packages/core/src/projects/__tests__/rollback-seed-batch.test.ts"
Task: "T033 [P] [US3] Add API request validation and sanitized error mapping tests in apps/api/src/routes/__tests__/rollback.contracts.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup review.
2. Complete Phase 2 shared contracts and metadata support.
3. Complete Phase 3 User Story 1.
4. Validate with `npm --workspace @testseed/core test` and `npm --workspace @testseed/api test`.
5. Stop and demo safe tagged rollback with deleted counts.

### Incremental Delivery

1. Setup and Foundational phases make seed batch metadata rollback-ready.
2. US1 delivers the basic rollback and report.
3. US2 locks in reverse dependency order.
4. US3 hardens all destructive-operation guardrails.
5. Polish runs the full project gate.

### Parallel Team Strategy

1. One developer updates shared types/persistence while another writes failing core/API tests.
2. After Foundational, split by story: US1 report/deletion, US2 ordering, US3 rejection/error mapping.
3. Rejoin for route integration, connection closure validation, and full turbo gate.

---

## Notes

- `[P]` tasks touch different files or can be drafted without depending on incomplete implementation details.
- `[US1]`, `[US2]`, and `[US3]` map directly to the three P1 user stories in `spec.md`.
- Do not add `@testseed/core` or `@testseed/db` imports to `apps/web`.
- Do not add Express, Next.js, Mongoose, or `@testseed/db` imports to `packages/core`.
- Never store or return MongoDB connection strings.
