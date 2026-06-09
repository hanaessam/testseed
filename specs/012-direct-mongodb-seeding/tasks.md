# Tasks: Direct MongoDB Seeding

**Input**: Design documents from `specs/012-direct-mongodb-seeding/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/direct-mongodb-seeding-core.md](./contracts/direct-mongodb-seeding-core.md), [quickstart.md](./quickstart.md)

**Tests**: Required by the implementation plan. Write focused Jest tests before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after dependencies are satisfied because it touches different files or independent sections.
- **[Story]**: Which user story this task belongs to.
- Every task includes exact file paths.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish shared core contract and module files for direct seeding.

- [ ] T001 Add direct seeding request/result/error type placeholders in `packages/types/src/generation.ts`
- [ ] T002 Create direct seeding core module skeleton in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T003 Export direct seeding module symbols from `packages/core/src/generation/index.ts`
- [ ] T004 Create direct seeding Jest test file skeleton in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core primitives required before any user story implementation can be completed.

**CRITICAL**: No user story implementation should begin until this phase is complete.

- [ ] T005 Define stable direct seeding error codes and `DirectMongoSeedingError` details in `packages/types/src/generation.ts`
- [ ] T006 Define `DirectMongoClientFactory`, `DirectMongoClient`, `DirectMongoDatabase`, and `DirectMongoCollection` interfaces in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T007 Define shared `DirectMongoSeedingDeps` with client factory, UUID generator, and optional timeout configuration in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T008 Implement safe connection-string trimming and required-value validation helper in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T009 Implement sanitized error summary helper that excludes connection strings and credentials in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T010 Implement dataset non-empty and generationOrder safety helpers in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T011 Add reusable fake Mongo client/database/collection test helpers in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`

**Checkpoint**: Foundation ready. User story work can now begin.

---

## Phase 3: User Story 1 - Test Connection Before Seeding (Priority: P1) MVP

**Goal**: Developers can test a transient MongoDB connection string and receive safe success/failure results before direct seeding is available.

**Independent Test**: Provide fake successful and failing clients; verify ping is called, success/failure is reported, clients close, and returned values never contain the connection string.

### Tests for User Story 1

- [ ] T012 [P] [US1] Add Jest test for successful ping result with database name and client closure in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T013 [P] [US1] Add Jest test for failed connect or ping returning sanitized failure and closing client in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T014 [P] [US1] Add Jest test for missing connection string rejecting safely before client creation in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T015 [P] [US1] Add Jest test for timeout option clamping/defaulting to the 5-10 second window in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T016 [P] [US1] Add Jest assertion helper that serializes connection results and verifies the raw connection string is absent in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`

### Implementation for User Story 1

- [ ] T017 [US1] Add `DirectMongoConnectionTestRequest` and `DirectMongoConnectionTestResult` contracts in `packages/types/src/generation.ts`
- [ ] T018 [US1] Implement `testDirectMongoConnection` with native-driver ping semantics in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T019 [US1] Ensure `testDirectMongoConnection` closes clients in success and failure paths in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T020 [US1] Ensure `testDirectMongoConnection` returns only safe message, databaseName, and sanitized errorSummary fields in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T021 [US1] Export `testDirectMongoConnection` and related types from `packages/core/src/generation/index.ts`

**Checkpoint**: User Story 1 is fully testable independently.

---

## Phase 4: User Story 2 - Confirm Before Insertion (Priority: P1)

**Goal**: Developers can generate a confirmation summary from the dataset and generationOrder, and no insertion can occur without explicit confirmation.

**Independent Test**: Build a valid dataset and verify confirmation includes target database, ordered collections, per-collection counts, total count, and warning; verify unconfirmed seeding creates no client and inserts no records.

### Tests for User Story 2

- [ ] T022 [P] [US2] Add Jest test for confirmation summary fields generated from dataset and generationOrder in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T023 [P] [US2] Add Jest test for confirmation summary using actual dataset collection lengths instead of caller-provided counts in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T024 [P] [US2] Add Jest test for empty dataset confirmation rejection in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T025 [P] [US2] Add Jest test for generationOrder missing a non-empty collection rejecting before insertion in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T026 [P] [US2] Add Jest test for `confirmed: false` rejecting seeding before client creation or insert attempts in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T027 [P] [US2] Add Jest test for invalid dataset validation blocking seeding before client creation in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`

### Implementation for User Story 2

- [ ] T028 [US2] Add `DirectSeedingConfirmationRequest` and `DirectSeedingConfirmationSummary` contracts in `packages/types/src/generation.ts`
- [ ] T029 [US2] Add `DirectSeedingRequest` contract with `schema`, `dataset`, `targetDatabaseName`, `connectionString`, and `confirmed` fields in `packages/types/src/generation.ts`
- [ ] T030 [US2] Implement `buildDirectSeedingConfirmation` in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T031 [US2] Implement confirmation warning constant for irreversible-without-rollback messaging in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T032 [US2] Implement pre-seeding guards for explicit confirmation, empty dataset, validation errors, and unsafe generationOrder in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T033 [US2] Export `buildDirectSeedingConfirmation` and confirmation contracts from `packages/core/src/generation/index.ts`

**Checkpoint**: User Story 2 is fully testable independently and prevents accidental insertion.

---

## Phase 5: User Story 3 - Report Seed Batch Results (Priority: P1)

**Goal**: Confirmed seeding inserts valid records sequentially in generationOrder, tags every inserted record with one seedBatchId, and returns structured success or partial-failure reports with rollback-support metadata.

**Independent Test**: Seed a fake multi-collection dataset; verify parent inserts before dependent collection, all inserted record copies share one seedBatchId, reports include counts and seedBatchId, partial failures distinguish succeeded and failed collections, and clients close.

### Tests for User Story 3

- [ ] T034 [P] [US3] Add Jest test for successful multi-collection seeding in generationOrder in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T035 [P] [US3] Add Jest test that every inserted record copy receives the same seedBatchId in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T036 [P] [US3] Add Jest test that seeding preserves existing record fields and does not mutate the input dataset in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T037 [P] [US3] Add Jest test for successful report shape including seedBatchId, successfulCollections, insertedRecordCounts, totalInsertedCount, and rollback metadata in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T038 [P] [US3] Add Jest test for partial failure report with successfulCollections, failedCollections, inserted counts, sanitized error summaries, and no later collection inserts in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T039 [P] [US3] Add Jest test that seeding closes the client after successful insertion and after partial failure in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`
- [ ] T040 [P] [US3] Add Jest assertion helper that serializes seeding reports/errors and verifies the raw connection string is absent in `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts`

### Implementation for User Story 3

- [ ] T041 [US3] Add `InsertedCollectionResult`, `DirectSeedingRollbackMetadata`, and `DirectSeedingReport` contracts in `packages/types/src/generation.ts`
- [ ] T042 [US3] Implement `seedMongoDataset` orchestration with validation, client creation, sequential inserts, and client closure in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T043 [US3] Implement UUID v4 seedBatchId generation dependency and default `crypto.randomUUID()` usage in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T044 [US3] Implement record-copy tagging that adds seedBatchId while preserving fields and avoiding dataset mutation in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T045 [US3] Implement successful collection result and inserted counts aggregation in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T046 [US3] Implement partial failure handling that stops after first failed collection and records sanitized error summaries in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T047 [US3] Implement rollback-support metadata for successfully inserted collections in `packages/core/src/generation/direct-mongodb-seeding.ts`
- [ ] T048 [US3] Export `seedMongoDataset`, `DirectMongoSeedingError`, and report contracts from `packages/core/src/generation/index.ts`

**Checkpoint**: User Story 3 is fully testable independently and completes the core direct seeding behavior.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and guardrails across all direct seeding stories.

- [ ] T049 Run `npx.cmd turbo build lint test` from repository root and record pass/fail result
- [ ] T050 [P] Run quickstart scope verification to confirm no direct seeding changes were made in `apps/web/`, `apps/api/`, or `packages/db/`
- [ ] T051 [P] Review `packages/core/src/generation/direct-mongodb-seeding.ts` for dependency-rule violations and absence of Express, Next.js, Mongoose, and `@testseed/db` imports
- [ ] T052 [P] Review `packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts` for tests covering client closure, connection-string absence, validation blocking, ordering, seedBatchId tagging, and partial failure
- [ ] T053 Update `specs/012-direct-mongodb-seeding/quickstart.md` only if implementation verification steps changed materially

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion.
- **User Story 2 (Phase 4)**: Depends on Foundational completion. Its confirmation implementation can be built independently, but its unconfirmed-seeding guard uses the shared seeding request foundation.
- **User Story 3 (Phase 5)**: Depends on Foundational completion and benefits from US2 pre-seeding guards.
- **Polish (Phase 6)**: Depends on all desired user story phases being complete.

### User Story Dependencies

- **User Story 1 (P1)**: MVP and first deliverable after foundation.
- **User Story 2 (P1)**: Can be implemented after foundation; should be completed before exposing any seeding execution.
- **User Story 3 (P1)**: Requires confirmed seeding guards and completes insertion/reporting behavior.

### Within Each User Story

- Write Jest tests first and confirm they fail before implementation.
- Add or refine shared contracts before implementing core functions that return them.
- Implement core helpers before orchestration.
- Export functions only after their implementation and tests exist.
- Stop at each checkpoint to validate the story independently.

---

## Parallel Opportunities

- T012-T016 can be written in parallel after T011 because they are separate test cases in the same test file but independent assertions.
- T022-T027 can be written in parallel after T011 because they cover separate confirmation and pre-seeding guards.
- T034-T040 can be written in parallel after T011 and shared dataset fixtures are present.
- T050-T052 can run in parallel after implementation is complete.

## Parallel Example: User Story 1

```text
Task: "T012 [US1] Add successful ping result test in packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts"
Task: "T013 [US1] Add failed connect or ping test in packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts"
Task: "T014 [US1] Add missing connection string test in packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts"
```

## Parallel Example: User Story 2

```text
Task: "T022 [US2] Add confirmation summary fields test in packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts"
Task: "T024 [US2] Add empty dataset confirmation rejection test in packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts"
Task: "T026 [US2] Add unconfirmed seeding rejection test in packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts"
```

## Parallel Example: User Story 3

```text
Task: "T034 [US3] Add successful multi-collection seeding test in packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts"
Task: "T036 [US3] Add field preservation and no dataset mutation test in packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts"
Task: "T038 [US3] Add partial failure report test in packages/core/src/generation/__tests__/direct-mongodb-seeding.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete Phase 3 connection testing.
4. Validate with focused Jest tests for `testDirectMongoConnection`.
5. Stop and demo safe connection testing before any insertion path exists.

### Incremental Delivery

1. Complete Setup + Foundational phases.
2. Deliver US1 connection testing.
3. Deliver US2 confirmation summary and no-confirmation guard.
4. Deliver US3 confirmed insertion and reporting.
5. Run full build/lint/test and quickstart verification.

### Core-Only Guardrail

Do not implement routes, UI, persistence repositories, rollback execution, JSON export changes, JavaScript seed script export changes, or feedback regeneration changes while completing this task list.

---

## Notes

- [P] tasks are parallelizable only after their stated dependencies are complete.
- All user story tasks include a `[US#]` label for traceability.
- Tests intentionally use fake MongoDB clients so core does not require a live database.
- Direct seeding reports and errors must never include raw connection strings.
- Commit after each phase or logical group when using the optional git hook.
