# Tasks: Feedback-Based Regeneration

**Input**: Design documents from `specs/008-feedback-based-regeneration/`

**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Explicit test tasks are included for core unit coverage, API contract/integration coverage, and web UI behavior coverage where existing test patterns allow.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared types and endpoint wiring points needed across all stories.

- [X] T001 Align feature references and invariants in `specs/008-feedback-based-regeneration/spec.md`
- [X] T002 Add feedback regeneration DTO types and outcome enums in `packages/types/src/generation.ts`
- [X] T003 [P] Add API-client request/response typings for regeneration in `apps/web/src/lib/api-client.ts`
- [X] T004 [P] Add route-level request validation schema for feedback payload in `apps/api/src/routes/generation.ts`
- [X] T005 [P] Add explicit lifecycle state map documentation in `specs/008-feedback-based-regeneration/contracts/feedback-regeneration-state.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared core and adapter plumbing that every user story depends on.

- [X] T006 Implement core orchestration entrypoint for feedback regeneration in `packages/core/src/generation/regenerate-with-feedback.ts`
- [X] T007 Wire regeneration use case exports in `packages/core/src/generation/index.ts`
- [X] T008 Adapt API generation route to invoke regeneration use case in `apps/api/src/routes/generation.ts`
- [X] T009 Implement API client call for feedback regeneration endpoint in `apps/web/src/lib/api-client.ts`
- [X] T010 Add workbench-level regeneration state scaffold in `apps/web/app/generate/page.tsx`
- [X] T011 Add explicit context-preservation handling for project context, schema context, collection counts, and accepted dataset in `packages/core/src/generation/regenerate-with-feedback.ts`
- [X] T012 Add API request mapping for project context, schema context, collection counts, and accepted dataset in `apps/api/src/routes/generation.ts`

### Tests for foundational behavior

- [X] T013 [P] Add core unit test scaffold for regeneration outcomes and context preservation in `packages/core/src/generation/__tests__/regenerate-with-feedback.test.ts`
- [X] T014 [P] Add API contract test scaffold for regeneration endpoint modes in `apps/api/src/routes/__tests__/feedback-regeneration.contracts.test.ts`
- [X] T015 [P] Add API integration test scaffold for cancel and failure handling in `apps/api/src/routes/__tests__/feedback-regeneration.integration.test.ts`

**Checkpoint**: Foundation ready. User stories can be implemented independently.

---

## Phase 3: User Story 1 - Regenerate from Feedback in Preview (Priority: P1) 🎯 MVP

**Goal**: User can submit feedback and receive regenerated preview results in the same workbench flow.

**Independent Test**: Submit non-empty feedback from workbench and verify the request runs and successful regenerated results appear in preview tables.

- [X] T016 [US1] Add feedback input UI section in `apps/web/components/generation/generation-workbench.tsx`
- [X] T017 [US1] Connect submit action from feedback input to workbench page handler in `apps/web/components/generation/generation-workbench.tsx`
- [X] T018 [US1] Implement submit handler to call regeneration API and update view model in `apps/web/app/generate/page.tsx`
- [X] T019 [US1] Enforce non-empty feedback submission guard in `apps/web/app/generate/page.tsx`
- [X] T020 [US1] Ensure successful `accepted` response replaces preview dataset in `apps/web/app/generate/page.tsx`
- [X] T021 [US1] Preserve project context, schema context, collection counts, and previous accepted dataset in regeneration payload creation in `apps/web/app/generate/page.tsx`
- [X] T022 [US1] Add request/response contract alignment notes in `specs/008-feedback-based-regeneration/contracts/feedback-regeneration-api.md`

### Tests for User Story 1

- [X] T023 [P] [US1] Add web UI behavior test for feedback submit guard and accepted outcome update in `apps/web/components/generation/__tests__/generation-workbench.feedback.test.tsx`

**Checkpoint**: US1 is independently functional and demonstrable.

---

## Phase 4: User Story 2 - Enforce Schema-Valid Outcomes (Priority: P1)

**Goal**: Regeneration only updates active dataset when schema-valid; invalid outputs are rejected.

**Independent Test**: Submit conflicting feedback and verify accepted dataset remains unchanged with rejected/partial outcome details.

- [X] T024 [US2] Enforce schema validation gate before accepting regenerated dataset in `packages/core/src/generation/regenerate-with-feedback.ts`
- [X] T025 [US2] Enforce constraint-precedence handling for conflicting feedback in `packages/core/src/generation/regenerate-with-feedback.ts`
- [X] T026 [US2] Preserve last accepted dataset on rejected/partial results in `apps/web/app/generate/page.tsx`
- [X] T027 [US2] Ensure API response includes validation details for non-accepted outcomes in `apps/api/src/routes/generation.ts`
- [X] T028 [US2] Document outcome invariants and acceptance rules in `specs/008-feedback-based-regeneration/data-model.md`

### Tests for User Story 2

- [X] T029 [P] [US2] Add core unit tests for rejected/partial validation gating in `packages/core/src/generation/__tests__/regenerate-with-feedback.test.ts`
- [X] T030 [P] [US2] Add API contract tests for rejected/partial responses in `apps/api/src/routes/__tests__/feedback-regeneration.contracts.test.ts`

**Checkpoint**: US2 is independently functional and protects validity gates.

---

## Phase 5: User Story 3 - Explain Partial or Rejected Changes (Priority: P2)

**Goal**: Users receive plain-language explanations for applied/skipped/rejected feedback outcomes.

**Independent Test**: Trigger partial and rejected outcomes and verify concise, understandable summaries are shown in the workbench.

- [X] T031 [US3] Add applied/skipped summary mapping in core regeneration result builder in `packages/core/src/generation/regenerate-with-feedback.ts`
- [X] T032 [US3] Surface plain-language mode-specific messages in API response adapter in `apps/api/src/routes/generation.ts`
- [X] T033 [US3] Render user-facing success/partial/rejected summaries in `apps/web/components/generation/generation-workbench.tsx`
- [X] T034 [US3] Add fallback message handling for unknown provider errors in `apps/web/app/generate/page.tsx`

### Tests for User Story 3

- [X] T035 [P] [US3] Add web UI behavior tests for partial/rejected explanation rendering in `apps/web/components/generation/__tests__/generation-workbench.feedback.test.tsx`

**Checkpoint**: US3 is independently functional with clear user messaging.

---

## Phase 6: User Story 4 - Preserve Existing Workbench and Editing Flow (Priority: P2)

**Goal**: Regeneration coexists with existing preview/editing behavior and does not alter export/direct seeding/rollback scope.

**Independent Test**: Use regeneration, then continue preview edits and verify existing behavior remains unchanged; verify cancel-on-leave and unsaved-edit rules.

- [X] T036 [US4] Enforce single in-flight request and disable submit while loading in `apps/web/app/generate/page.tsx`
- [X] T037 [US4] Add navigate-away cancellation for in-flight regeneration with abort handling in `apps/web/app/generate/page.tsx`
- [X] T038 [US4] Ensure unsaved preview edits are excluded from regeneration payload in `apps/web/app/generate/page.tsx`
- [X] T039 [US4] Keep preview-edit compatibility by isolating regeneration state updates in `apps/web/components/generation/collection-data-table.tsx`
- [X] T040 [US4] Ensure no export/direct-seeding/rollback behavior changes by limiting route modifications to `apps/api/src/routes/generation.ts`
- [X] T041 [US4] Implement explicit UI lifecycle mapping (`idle`, `submitted`, `in_progress`, `accepted`, `partial`, `rejected`, `cancelled`, `failed`) in `apps/web/app/generate/page.tsx`
- [X] T042 [US4] Capture canonical mode and lifecycle-state contract rules in `specs/008-feedback-based-regeneration/contracts/feedback-regeneration-state.md`

### Tests for User Story 4

- [X] T043 [P] [US4] Add web UI behavior tests for lifecycle mapping and cancellation flow in `apps/web/components/generation/__tests__/generation-workbench.feedback.test.tsx`
- [X] T044 [P] [US4] Add API integration tests for cancellation and failure responses in `apps/api/src/routes/__tests__/feedback-regeneration.integration.test.ts`

**Checkpoint**: US4 is independently functional and non-regressive.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finalize docs, run full verification, and ensure delivery readiness.

- [X] T045 [P] Update feature quickstart with final verification steps in `specs/008-feedback-based-regeneration/quickstart.md`
- [X] T046 [P] Reconcile plan/source file references with completed scope in `specs/008-feedback-based-regeneration/plan.md`
- [X] T047 Run full workspace verification command `npx.cmd turbo build lint test` from repository root
- [X] T048 Update implementation progress notes for handoff in `specs/008-feedback-based-regeneration/tasks.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all user stories
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 2 and integrates with US1 regeneration flow
- **Phase 5 (US3)**: Depends on Phase 2 and US2 outcome modes
- **Phase 6 (US4)**: Depends on Phase 2 and integrates with US1-US3 behaviors
- **Phase 7 (Polish)**: Depends on all selected story phases

### User Story Dependencies

- **US1 (P1)**: First MVP slice after foundational work
- **US2 (P1)**: Depends on foundational plus US1 flow availability
- **US3 (P2)**: Depends on US2 outcome model details
- **US4 (P2)**: Depends on US1 and US2 state flow behavior

### Parallel Opportunities

- T003, T004, and T005 can run in parallel in Setup.
- T013, T014, and T015 can run in parallel in Foundational test scaffolding.
- T045 and T046 can run in parallel in Polish.
- Core and web sub-tasks inside a story can run in parallel only where distinct files are touched and prerequisites are met.

---

## Parallel Example: User Story 1

```bash
Task: "Add feedback input UI section in apps/web/components/generation/generation-workbench.tsx"  # T016
Task: "Implement submit handler to call regeneration API and update view model in apps/web/app/generate/page.tsx"  # T018
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) end-to-end.
3. Validate independent test for US1 in workbench.

### Incremental Delivery

1. Add US2 to enforce validation gate behavior.
2. Add US3 for user-facing explanation quality.
3. Add US4 for flow-preservation and cancellation/unsaved-edit safeguards.
4. Run Phase 7 polish and full verification.

### Team Parallel Strategy

1. One developer handles core and API orchestration tasks.
2. One developer handles web workbench state and interaction tasks.
3. One developer handles documentation/contracts updates and verification tasks.

---

## Notes

- All tasks use strict checklist format with IDs and file paths.
- User story tasks include mandatory `[US#]` labels.
- Setup/foundational/polish tasks intentionally omit story labels.
- Keep implementation within existing architecture boundaries and feature scope.
