# Tasks: Schema Review

**Input**: Design documents from `/specs/004-schema-review/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/schema-review.md, quickstart.md
**Tests**: Included because the specification and plan require parser, discovery, API/contract, persistence, and acceptance verification.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the active feature context, existing contracts, and affected files before implementation.

- [X] T001 Read `docs/requirements.md` and verify Schema Review requirements align with feature 004 in `specs/004-schema-review/spec.md`
- [X] T002 Read active design artifacts in `specs/004-schema-review/plan.md`, `specs/004-schema-review/data-model.md`, `specs/004-schema-review/contracts/schema-review.md`, `specs/004-schema-review/research.md`, and `specs/004-schema-review/quickstart.md`
- [X] T003 Inspect current schema contracts in `packages/types/src/schema.ts` for review metadata fields and dependency-rule compliance
- [X] T004 Inspect current Generate page review flow in `apps/web/app/generate/page.tsx`
- [X] T005 Inspect current project schema save route in `apps/api/src/routes/projects.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Preserve review metadata from schema sources and ensure saved snapshots can carry the reviewed shape.

**CRITICAL**: No user story work should begin until reviewed schema metadata can flow through source parsing, validation, and project snapshots.

- [X] T006 [P] Add or verify shared `SchemaField` and `CollectionSchema` review metadata fields in `packages/types/src/schema.ts`
- [X] T007 [P] Add parser tests for declared enum source and explicit reference confidence in `packages/core/src/schema/__tests__/parser.test.ts`
- [X] T008 Update manual schema parsing to tag declared enums and explicit refs in `packages/core/src/schema/local-parser.ts`
- [X] T009 [P] Add MongoDB discovery tests for low-confidence warnings, nested fields, arrays, inferred enums, inferred refs, sample counts, and collection warnings in `packages/core/src/schema/__tests__/mongodb-discovery.test.ts`
- [X] T010 Verify MongoDB discovery preserves review metadata without storing connection strings in `packages/core/src/schema/mongodb-discovery.ts`
- [X] T011 [P] Add project snapshot persistence test for reviewed schema metadata in `packages/core/src/projects/__tests__/project-history.test.ts`
- [X] T012 Verify `saveParsedSchemaToProject` saves the reviewed schema exactly as submitted in `packages/core/src/projects/save-parsed-schema.ts`

**Checkpoint**: Foundation ready - schema review metadata can be produced, validated, and saved.

---

## Phase 3: User Story 1 - Review Detected Collections and Fields (Priority: P1) MVP

**Goal**: Authenticated developers can inspect detected collections/fields, correct supported field details, and save the reviewed schema as the active snapshot.

**Independent Test**: Parse or discover a schema with multiple collections, verify collection tabs and field details are visible, edit supported field details, save, and confirm the active snapshot includes edits and warnings.

### Tests for User Story 1

- [X] T013 [P] [US1] Add API validation coverage for reviewed schema metadata and nested children in `apps/api/src/routes/__tests__/project-history.contracts.test.ts`
- [X] T014 [P] [US1] Add core persistence assertions for edited type, required, ref, inferred enum, warnings, and nested children in `packages/core/src/projects/__tests__/project-history.test.ts`

### Implementation for User Story 1

- [X] T015 [US1] Expand recursive `PUT /projects/:projectId/schema` validation to accept reviewed field metadata in `apps/api/src/routes/projects.ts`
- [X] T016 [US1] Expand collection validation for `sampleCount` and collection warnings in `apps/api/src/routes/projects.ts`
- [X] T017 [US1] Add Generate page state updater for immutable field-level review edits in `apps/web/app/generate/page.tsx`
- [X] T018 [US1] Add editable field type control in the schema review table in `apps/web/app/generate/page.tsx`
- [X] T019 [US1] Add editable required-status control while keeping unique read-only in `apps/web/app/generate/page.tsx`
- [X] T020 [US1] Add field warning editing control in review evidence in `apps/web/app/generate/page.tsx`
- [X] T021 [US1] Verify save-schema payload contains only `ParsedSchema` review data and no MongoDB connection string in `apps/web/app/generate/page.tsx`

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Understand Inference Confidence and Warnings (Priority: P2)

**Goal**: Low-confidence fields and collection warnings remain visible while still allowing save and generation flow.

**Independent Test**: Discover a sparse or mixed-type MongoDB sample, verify warning/confidence markers are visible, save remains enabled, and warnings persist in the active snapshot.

### Tests for User Story 2

- [X] T022 [P] [US2] Add or extend MongoDB discovery test cases for sparse fields, mixed types, empty collections, and warning preservation in `packages/core/src/schema/__tests__/mongodb-discovery.test.ts`

### Implementation for User Story 2

- [X] T023 [US2] Ensure field confidence badges and warning text render beside affected fields in `apps/web/app/generate/page.tsx`
- [X] T024 [US2] Ensure collection-level warnings and sample counts render in the active collection panel in `apps/web/app/generate/page.tsx`
- [X] T025 [US2] Ensure `Save schema` remains enabled when reviewed fields have low confidence warnings in `apps/web/app/generate/page.tsx`

**Checkpoint**: User Story 2 works independently with low-confidence discovered schemas.

---

## Phase 5: User Story 3 - Review Enum-Like Values (Priority: P3)

**Goal**: Declared enum values are visible and read-only, while inferred enum-like values can be edited before saving.

**Independent Test**: Parse a manual enum and discover a low-cardinality string field, then verify declared values are read-only, inferred values are editable, varied values do not create enums, and saved snapshots preserve edits.

### Tests for User Story 3

- [X] T026 [P] [US3] Add parser assertions for declared enum read evidence in `packages/core/src/schema/__tests__/parser.test.ts`
- [X] T027 [P] [US3] Add discovery assertions that varied sampled string values do not create enum candidates in `packages/core/src/schema/__tests__/mongodb-discovery.test.ts`

### Implementation for User Story 3

- [X] T028 [US3] Render declared enum values as read-only review badges in `apps/web/app/generate/page.tsx`
- [X] T029 [US3] Add editable inferred enum-like values input that persists `enumSource: "inferred"` in `apps/web/app/generate/page.tsx`

**Checkpoint**: User Story 3 works independently for manual and discovered enum-like values.

---

## Phase 6: User Story 4 - Review Possible References (Priority: P4)

**Goal**: Explicit and inferred references are visible with confidence labels, and non-explicit references can be corrected before saving.

**Independent Test**: Review a manual explicit ref and a discovered ObjectId-like field, verify explicit refs are labeled read-only, inferred/possible refs are editable, and saved snapshots preserve the corrected ref and confidence.

### Tests for User Story 4

- [X] T030 [P] [US4] Add parser assertions for explicit reference confidence in `packages/core/src/schema/__tests__/parser.test.ts`
- [X] T031 [P] [US4] Add discovery assertions for inferred ObjectId reference confidence in `packages/core/src/schema/__tests__/mongodb-discovery.test.ts`

### Implementation for User Story 4

- [X] T032 [US4] Render explicit references as read-only evidence with `explicit` confidence in `apps/web/app/generate/page.tsx`
- [X] T033 [US4] Add editable non-explicit reference input that preserves inferred or possible confidence in `apps/web/app/generate/page.tsx`

**Checkpoint**: User Story 4 works independently for explicit and inferred references.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, acceptance verification, and project-wide quality checks.

- [X] T034 [P] Update Schema Review workflow documentation in `README.md`
- [X] T035 [P] Update active Spec Kit marker to feature 004 in `AGENTS.md`
- [X] T036 [P] Verify `specs/004-schema-review/quickstart.md` acceptance steps manually against the Generate page
- [X] T037 Run focused core tests for parser, MongoDB discovery, and project history in `packages/core`
- [X] T038 Run focused API and web checks using scripts in `apps/api/package.json` and `apps/web/package.json`
- [X] T039 Run full required verification with `npx turbo build lint test` from root `package.json`
- [X] T040 Confirm local web and API servers from `README.md` are reachable for manual review at `http://localhost:3000` and `http://localhost:3001`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational and is the MVP.
- **US2 (Phase 4)**: Depends on Foundational; can be implemented after or alongside US1 if UI save behavior is coordinated.
- **US3 (Phase 5)**: Depends on Foundational; can be implemented after US1 review controls exist.
- **US4 (Phase 6)**: Depends on Foundational; can be implemented after US1 review controls exist.
- **Polish (Phase 7)**: Depends on desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on other user stories.
- **US2 (P2)**: Independent after Foundational, shares Generate page with US1.
- **US3 (P3)**: Independent after Foundational, shares review evidence UI with US1.
- **US4 (P4)**: Independent after Foundational, shares review evidence UI with US1.

### Parallel Opportunities

- T006, T007, T009, and T011 can run in parallel.
- T013 and T014 can run in parallel.
- T022 can run in parallel with UI-only US2 tasks after Foundational.
- T026 and T027 can run in parallel.
- T030 and T031 can run in parallel.
- T034, T035, and T036 can run in parallel.

---

## Parallel Example: User Story 1

```bash
Task: "Add API validation coverage for reviewed schema metadata and nested children in apps/api/src/routes/__tests__/project-history.contracts.test.ts"
Task: "Add core persistence assertions for edited type, required, ref, inferred enum, warnings, and nested children in packages/core/src/projects/__tests__/project-history.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Add parser assertions for declared enum read evidence in packages/core/src/schema/__tests__/parser.test.ts"
Task: "Add discovery assertions that varied sampled string values do not create enum candidates in packages/core/src/schema/__tests__/mongodb-discovery.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete US1 API validation, persistence tests, and Generate page edit/save controls.
3. Run focused parser/project/API/web checks.
4. Validate the user can save edited reviewed schema snapshots.

### Incremental Delivery

1. Deliver US1 as the schema review checkpoint and save flow.
2. Add US2 warning/confidence visibility and low-confidence continuation.
3. Add US3 enum-specific declared vs inferred behavior.
4. Add US4 reference-specific explicit vs inferred behavior.
5. Finish documentation and full verification.

### Team Parallel Strategy

1. One developer handles core parser/discovery/persistence tests.
2. One developer handles API validation contract work.
3. One developer handles Generate page review controls.
4. Rejoin for focused checks, quickstart acceptance, and `npx turbo build lint test`.

---

## Notes

- [P] tasks use different files or can be completed without depending on incomplete same-file edits.
- Every user story remains independently testable from the Generate page.
- Do not add field or collection add/remove behavior for this feature.
- Do not store MongoDB connection strings in review state, project context, schema snapshots, logs, or docs.
- Preserve the dependency direction from `AGENTS.md`.
