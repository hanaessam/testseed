# Tasks: Reviewable Feedback Regeneration

**Input**: Design documents from `specs/009-review-regeneration/`

**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Explicit test tasks are included for shared type/core behavior, API contract/integration behavior, and workbench UI behavior because the implementation plan calls for focused verification of the review/compare-before-accept delta.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other `[P]` tasks in the same phase when touching different files.
- **[Story]**: Maps task to a user story from `spec.md`.
- All task descriptions include exact repository paths.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared contracts and confirm the 009 work extends existing 008 seams.

- [X] T001 Review existing 008 feedback regeneration contracts before editing `packages/types/src/generation.ts`
- [X] T002 [P] Add candidate review contract notes to `specs/009-review-regeneration/contracts/reviewable-feedback-regeneration.md`
- [X] T003 [P] Add quickstart acceptance/rejection verification notes to `specs/009-review-regeneration/quickstart.md`
- [X] T004 Add `CandidateChangeSummary`, `CandidateReviewState`, and candidate review response fields in `packages/types/src/generation.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared candidate comparison and review-state helpers that all user stories depend on.

**CRITICAL**: No user story implementation should begin until this phase is complete.

### Tests for Foundational Behavior

- [X] T005 [P] Add failing tests for deterministic candidate change summaries in `packages/core/src/generation/__tests__/review-feedback-candidate.test.ts`
- [X] T006 [P] Add failing tests for accept/reject/abandon review-state transitions in `packages/core/src/generation/__tests__/review-feedback-candidate.test.ts`

### Implementation for Foundational Behavior

- [X] T007 Implement deterministic accepted-vs-candidate comparison helpers in `packages/core/src/generation/review-feedback-candidate.ts`
- [X] T008 Implement candidate review-state transition helpers in `packages/core/src/generation/review-feedback-candidate.ts`
- [X] T009 Export candidate review helpers from `packages/core/src/generation/index.ts`
- [X] T010 Add pending candidate state fields to `apps/web/src/lib/generation-workbench-state.ts`

**Checkpoint**: Candidate contracts and shared helpers are ready for user story work.

---

## Phase 3: User Story 1 - Review Candidate Before Accepting (Priority: P1) MVP

**Goal**: Regenerated data appears as a candidate result and does not replace the accepted dataset until the user accepts it.

**Independent Test**: Start from an accepted dataset, submit feedback, and confirm the regenerated result is reviewable while the active accepted dataset remains unchanged until accept.

### Tests for User Story 1

- [X] T011 [P] [US1] Add core tests for mapping regeneration output into pending candidate response metadata in `packages/core/src/generation/__tests__/regenerate-with-feedback.test.ts`
- [X] T012 [P] [US1] Add API contract tests for candidate response shape without accepted-dataset replacement in `apps/api/src/routes/__tests__/feedback-regeneration.contracts.test.ts`
- [X] T013 [P] [US1] Add web behavior tests for pending candidate display and accepted dataset preservation in `apps/web/components/generation/__tests__/generation-workbench.feedback.test.tsx`

### Implementation for User Story 1

- [X] T014 [US1] Extend regeneration response mapping with `candidateReview.state: "pending_review"` in `packages/core/src/generation/regenerate-with-feedback.ts`
- [X] T015 [US1] Prevent feedback regeneration route from persisting candidate output as accepted before explicit user acceptance in `apps/api/src/routes/generation.ts`
- [X] T016 [US1] Add pending candidate response handling to `apps/web/src/lib/api-client.ts`
- [X] T017 [US1] Store regenerated output as `pendingCandidate` instead of replacing `dataset` in `apps/web/components/generation/generation-workbench.tsx`
- [X] T018 [US1] Add accept candidate action that promotes `pendingCandidate.dataset` to accepted `dataset` in `apps/web/components/generation/generation-workbench.tsx`
- [X] T019 [US1] Persist accepted candidate through the existing saved generated dataset update/save path using `packages/core/src/generation/update-saved-generated-dataset.ts` from `apps/api/src/routes/generation.ts`
- [X] T020 [US1] Call the accept/persist flow when the user accepts `pendingCandidate` in `apps/web/components/generation/generation-workbench.tsx`
- [X] T021 [US1] Add reject or dismiss candidate action that clears `pendingCandidate` and preserves accepted `dataset` in `apps/web/components/generation/generation-workbench.tsx`

**Checkpoint**: US1 is independently functional and demonstrable as the MVP.

---

## Phase 4: User Story 2 - Compare Changes Clearly (Priority: P1)

**Goal**: Users can quickly understand what changed, what stayed stable, and whether feedback was applied before accepting a candidate.

**Independent Test**: Submit feedback such as `make users Canadian` and confirm the candidate review identifies changed collections, notable fields, preserved structure, partial application, or no meaningful changes.

### Tests for User Story 2

- [X] T022 [P] [US2] Add core tests for changed collections, notable fields, preserved collections, and no-change summaries in `packages/core/src/generation/__tests__/review-feedback-candidate.test.ts`
- [X] T023 [P] [US2] Add API contract tests for `candidateReview.changeSummary` payloads in `apps/api/src/routes/__tests__/feedback-regeneration.contracts.test.ts`
- [X] T024 [P] [US2] Add web behavior tests for candidate change summary rendering in `apps/web/components/generation/__tests__/generation-workbench.feedback.test.tsx`

### Implementation for User Story 2

- [X] T025 [US2] Attach deterministic `changeSummary` metadata to regeneration responses in `packages/core/src/generation/regenerate-with-feedback.ts`
- [X] T026 [US2] Pass `candidateReview.changeSummary` through the generation route response in `apps/api/src/routes/generation.ts`
- [X] T027 [US2] Render changed collections, notable fields, preserved collections, and no-change state in `apps/web/components/generation/generation-workbench.tsx`
- [X] T028 [US2] Render applied and skipped feedback summaries from candidate review metadata in `apps/web/components/generation/agent-dock.tsx`

**Checkpoint**: US2 is independently functional on top of pending candidate review.

---

## Phase 5: User Story 3 - Protect Against Invalid Candidate Results (Priority: P1)

**Goal**: Invalid candidates cannot be accepted, duplicate unique values or invalid references get one automatic retry, and unresolved blocking problems ask for revised feedback.

**Independent Test**: Submit feedback likely to create duplicate unique values or broken references and confirm the accepted dataset remains unchanged, one retry occurs when fixable, and invalid retry output requests revised feedback.

### Tests for User Story 3

- [X] T029 [P] [US3] Add core tests for blocking validation errors preventing candidate acceptance in `packages/core/src/generation/__tests__/review-feedback-candidate.test.ts`
- [X] T030 [P] [US3] Add core tests for one automatic retry on duplicate unique values or invalid references in `packages/core/src/generation/__tests__/regenerate-with-feedback.test.ts`
- [X] T031 [P] [US3] Add API integration tests for retry-success and retry-still-invalid outcomes in `apps/api/src/routes/__tests__/feedback-regeneration.integration.test.ts`
- [X] T032 [P] [US3] Add web behavior tests for invalid candidate and awaiting revised feedback states in `apps/web/components/generation/__tests__/generation-workbench.feedback.test.tsx`

### Implementation for User Story 3

- [X] T033 [US3] Add blocking validation guard for candidate acceptance decisions in `packages/core/src/generation/review-feedback-candidate.ts`
- [X] T034 [US3] Add one-retry regeneration path using validation feedback in `packages/core/src/generation/regenerate-with-feedback.ts`
- [X] T035 [US3] Return `candidateReview.state: "awaiting_revised_feedback"` after an invalid retry in `packages/core/src/generation/regenerate-with-feedback.ts`
- [X] T036 [US3] Preserve accepted dataset and expose retry metadata in invalid/retried API responses in `apps/api/src/routes/generation.ts`
- [X] T037 [US3] Disable accept controls for candidates with blocking validation results in `apps/web/components/generation/generation-workbench.tsx`
- [X] T038 [US3] Show revised-feedback prompt for invalid retry outcomes in `apps/web/components/generation/agent-dock.tsx`

**Checkpoint**: US3 is independently functional and protects accepted dataset validity.

---

## Phase 6: User Story 4 - Continue Iterating From Accepted Data (Priority: P2)

**Goal**: Later feedback always starts from the last accepted dataset, pending candidates block new feedback, and abandoned candidates are discarded on workbench exit.

**Independent Test**: Generate a candidate, reject it, submit new feedback, and confirm the accepted dataset is used as baseline; generate another candidate, leave the workbench, and confirm the candidate is gone on return.

### Tests for User Story 4

- [X] T039 [P] [US4] Add web behavior tests for blocking feedback submission while a candidate is pending in `apps/web/components/generation/__tests__/generation-workbench.feedback.test.tsx`
- [X] T040 [P] [US4] Add web behavior tests for accepted dataset baseline after accept, reject, and abandon in `apps/web/components/generation/__tests__/generation-workbench.feedback.test.tsx`
- [X] T041 [P] [US4] Add API contract test proving regeneration payload uses accepted dataset rather than pending candidate state in `apps/api/src/routes/__tests__/feedback-regeneration.contracts.test.ts`
- [X] T042 [P] [US4] Add API/web test proving accepted candidate becomes the durable saved/accepted dataset identity in `apps/api/src/routes/__tests__/feedback-regeneration.integration.test.ts`

### Implementation for User Story 4

- [X] T043 [US4] Disable feedback submission while `pendingCandidate` exists in `apps/web/components/generation/agent-dock.tsx`
- [X] T044 [US4] Build regeneration payloads only from accepted `dataset` state in `apps/web/components/generation/generation-workbench.tsx`
- [X] T045 [US4] Clear `pendingCandidate` on workbench unmount or route exit in `apps/web/components/generation/generation-workbench.tsx`
- [X] T046 [US4] Verify `apps/web/components/generation/export-drawer.tsx` remains governed by accepted `dataset` only; do not change export, direct seeding, or rollback behavior unless this regression check fails
- [X] T047 [US4] Verify `apps/web/components/generation/saved-datasets-panel.tsx` loads accepted datasets without restoring abandoned candidates; do not change unrelated saved dataset behavior unless this regression check fails

**Checkpoint**: US4 is independently functional and keeps iteration predictable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finalize docs, verify scope boundaries, and run full workspace validation.

- [X] T048 [P] Reconcile implementation notes with final behavior in `specs/009-review-regeneration/quickstart.md`
- [X] T049 [P] Update task completion notes after implementation in `specs/009-review-regeneration/tasks.md`
- [X] T050 [P] Verify no export/direct-seeding/rollback task drift is documented in `specs/009-review-regeneration/plan.md`
- [X] T051 Run full workspace verification and record outcome in `specs/009-review-regeneration/tasks.md` after `npx.cmd turbo build lint test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2 and delivers the MVP review-before-accept behavior.
- **Phase 4 (US2)**: Depends on Phase 2 and integrates with the candidate state from US1.
- **Phase 5 (US3)**: Depends on Phase 2 and integrates with the candidate state from US1.
- **Phase 6 (US4)**: Depends on Phase 2 and candidate lifecycle behavior from US1.
- **Phase 7 (Polish)**: Depends on all selected story phases.

### User Story Dependencies

- **US1 (P1)**: First MVP slice after foundational work.
- **US2 (P1)**: Can be implemented after foundational helpers exist, but is easiest after US1 candidate state exists.
- **US3 (P1)**: Can be implemented after foundational helpers exist, but is easiest after US1 candidate state exists.
- **US4 (P2)**: Depends on US1 candidate lifecycle and accepted dataset baseline behavior.

### Parallel Opportunities

- T002 and T003 can run in parallel during Setup.
- T005 and T006 can run in parallel before foundational implementation.
- T011, T012, and T013 can run in parallel for US1 tests.
- T022, T023, and T024 can run in parallel for US2 tests.
- T029, T030, T031, and T032 can run in parallel for US3 tests.
- T039, T040, T041, and T042 can run in parallel for US4 tests.
- T048, T049, and T050 can run in parallel during Polish.

---

## Parallel Example: User Story 1

```bash
Task: "Add core tests for mapping regeneration output into pending candidate response metadata in packages/core/src/generation/__tests__/regenerate-with-feedback.test.ts"
Task: "Add API contract tests for candidate response shape without accepted-dataset replacement in apps/api/src/routes/__tests__/feedback-regeneration.contracts.test.ts"
Task: "Add web behavior tests for pending candidate display and accepted dataset preservation in apps/web/components/generation/__tests__/generation-workbench.feedback.test.tsx"
```

---

## Parallel Example: User Story 3

```bash
Task: "Add core tests for one automatic retry on duplicate unique values or invalid references in packages/core/src/generation/__tests__/regenerate-with-feedback.test.ts"
Task: "Add API integration tests for retry-success and retry-still-invalid outcomes in apps/api/src/routes/__tests__/feedback-regeneration.integration.test.ts"
Task: "Add web behavior tests for invalid candidate and awaiting revised feedback states in apps/web/components/generation/__tests__/generation-workbench.feedback.test.tsx"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 setup and Phase 2 foundational helpers.
2. Complete Phase 3 so regenerated output becomes a pending candidate.
3. Stop and validate that accept promotes the candidate and reject preserves the previous accepted dataset.

### Incremental Delivery

1. Add US2 comparison summaries so candidate review is understandable.
2. Add US3 invalid candidate protection and one automatic retry.
3. Add US4 baseline, pending-candidate submission blocking, and discard-on-leave behavior.
4. Run Phase 7 documentation and full verification.

### Team Parallel Strategy

1. One developer handles shared types/core helper work in `packages/types/src/generation.ts` and `packages/core/src/generation/`.
2. One developer handles API contracts and route behavior in `apps/api/src/routes/`.
3. One developer handles workbench state and UI behavior in `apps/web/components/generation/` and `apps/web/src/lib/`.

---

## Notes

- Keep all implementation inside existing 008 seams; do not introduce a new regeneration endpoint.
- Keep pending candidates session-scoped and do not persist abandoned candidates.
- Keep export, direct seeding, rollback, and unrelated preview editing behavior unchanged.
- Tests should be written before implementation and should fail for the missing 009 behavior before code changes.
- Verification passed on 2026-06-09 with `npx.cmd turbo build lint test` (15/15 tasks successful).
