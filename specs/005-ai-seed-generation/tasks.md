# Tasks: AI Seed Generation

**Input**: Design documents from `specs/005-ai-seed-generation/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ai-seed-generation-api.md`, `quickstart.md`

**Tests**: Included because the feature plan explicitly requires core validation tests, API contract checks, and web build/lint verification.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently after the shared foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase because it touches different files and has no dependency on incomplete tasks.
- **[Story]**: Maps to user stories from `spec.md`.
- Every task includes exact file paths.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared generation feature areas and baseline exports.

- [X] T001 Create `packages/types/src/generation.ts` for AI seed generation shared contracts.
- [X] T002 Create `packages/core/src/generation/index.ts` for core generation use case exports.
- [X] T003 Create `packages/core/src/generation/__tests__/` for generation-focused core tests.
- [X] T004 Create `apps/api/src/routes/generation.ts` for authenticated generation and refinement routes.
- [X] T005 Create `apps/api/src/routes/__tests__/ai-seed-generation.contracts.test.ts` for API contract coverage.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define cross-layer contracts and safe provider boundaries required by every user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Define `GenerationValidationResult`, `GeneratedRecord`, `GeneratedDataset`, and `GenerationStatus` types in `packages/types/src/generation.ts`.
- [X] T007 Define `GenerateSeedDataRequest`, `GenerateSeedDataResponse`, `GenerationProviderRequest`, and `GenerationProviderResponse` types in `packages/types/src/generation.ts`.
- [X] T008 Define `ChatRefinementMessage`, `RefineGeneratedDatasetRequest`, and `RefineGeneratedDatasetResponse` types in `packages/types/src/generation.ts`.
- [X] T009 Export generation contracts from `packages/types/src/api.ts`.
- [X] T010 Export generation contracts from `packages/types/src/index.ts`.
- [X] T011 Add pure provider interface types for generation and refinement orchestration in `packages/core/src/generation/index.ts`.
- [X] T012 Add OpenAI API key configuration validation for generation routes in `apps/api/src/index.ts` without logging or returning the key.
- [X] T013 Mount the generation router under `/projects` in `apps/api/src/index.ts`.
- [X] T014 Add generation and refinement API client methods in `apps/web/src/lib/api-client.ts`.

**Checkpoint**: Shared contracts and route/client wiring are ready for story implementation.

---

## Phase 3: User Story 1 - Generate Valid Relational Seed Records (Priority: P1) MVP

**Goal**: Generate valid JSON seed records grouped by collection with parent records created before child records and ObjectId references pointing to generated parents.

**Independent Test**: Use a reviewed schema with at least one parent collection and one child reference, request generation, and confirm `generationOrder`, grouped JSON, stable `_id` values, and valid references.

### Tests for User Story 1

- [X] T015 [P] [US1] Add core tests for parent-before-child dependency ordering in `packages/core/src/generation/__tests__/build-generation-plan.test.ts`.
- [X] T016 [P] [US1] Add core tests for generated ObjectId reference integrity in `packages/core/src/generation/__tests__/validate-generated-dataset.test.ts`.
- [X] T017 [P] [US1] Add API contract tests for `POST /projects/:projectId/generations` success response shape in `apps/api/src/routes/__tests__/ai-seed-generation.contracts.test.ts`.

### Implementation for User Story 1

- [X] T018 [US1] Implement dependency graph extraction from reviewed references in `packages/core/src/generation/build-generation-plan.ts`.
- [X] T019 [US1] Implement parent-first collection sorting and generation plan output in `packages/core/src/generation/build-generation-plan.ts`.
- [X] T020 [US1] Implement stable ObjectId generation helpers for generated records in `packages/core/src/generation/generate-seed-data.ts`.
- [X] T021 [US1] Implement grouped JSON orchestration with injected provider dependency in `packages/core/src/generation/generate-seed-data.ts`.
- [X] T022 [US1] Implement reference validation for generated datasets in `packages/core/src/generation/validate-generated-dataset.ts`.
- [X] T023 [US1] Add OpenAI-backed seed generation provider adapter in `apps/api/src/routes/generation.ts`.
- [X] T024 [US1] Add authenticated `POST /projects/:projectId/generations` route handler in `apps/api/src/routes/generation.ts`.
- [X] T025 [US1] Return sanitized generation success, planning error, validation error, missing schema, and provider failure responses in `apps/api/src/routes/generation.ts`.
- [X] T026 [US1] Display generated JSON grouped by collection and generation order in `apps/web/app/generate/page.tsx`.

**Checkpoint**: User Story 1 is independently functional as the MVP.

---

## Phase 4: User Story 2 - Choose Record Counts Per Collection (Priority: P2)

**Goal**: Let users select non-negative record counts per reviewed collection, see the expected total, and receive clear limit/reference warnings.

**Independent Test**: Select multiple collections, set different counts, generate records, and confirm returned counts match the requested counts unless a documented planning error blocks generation.

### Tests for User Story 2

- [X] T027 [P] [US2] Add core tests for count validation, safe total limits, zero counts, and parent count warnings in `packages/core/src/generation/__tests__/build-generation-plan.test.ts`.
- [X] T028 [P] [US2] Add API contract tests for invalid collection names, negative counts, zero total, and safe limit errors in `apps/api/src/routes/__tests__/ai-seed-generation.contracts.test.ts`.

### Implementation for User Story 2

- [X] T029 [US2] Add collection count validation and safe total limit handling in `packages/core/src/generation/build-generation-plan.ts`.
- [X] T030 [US2] Add parent-count-zero planning validation and suggested actions in `packages/core/src/generation/build-generation-plan.ts`.
- [X] T031 [US2] Validate `collectionCounts` request payloads in `apps/api/src/routes/generation.ts`.
- [X] T032 [US2] Add per-collection count controls and expected total display in `apps/web/app/generate/page.tsx`.
- [X] T033 [US2] Show safe limit and missing parent count warnings before generation in `apps/web/app/generate/page.tsx`.

**Checkpoint**: User Story 2 works independently with count controls and planning validation.

---

## Phase 5: User Story 3 - Handle Invalid or Incomplete Generated Output (Priority: P3)

**Goal**: Validate AI output, retry malformed or invalid results with sanitized feedback, and never mark invalid datasets as complete.

**Independent Test**: Simulate malformed provider output and schema-invalid records, then confirm bounded retry behavior and actionable validation messages.

### Tests for User Story 3

- [X] T034 [P] [US3] Add core tests for malformed provider output retry behavior in `packages/core/src/generation/__tests__/generate-seed-data.test.ts`.
- [X] T035 [P] [US3] Add core tests for required fields, field types, enum values, uniqueness, nested fields, arrays, missing collections, and extra collections in `packages/core/src/generation/__tests__/validate-generated-dataset.test.ts`.
- [X] T036 [P] [US3] Add API contract tests for validation failure and provider failure responses in `apps/api/src/routes/__tests__/ai-seed-generation.contracts.test.ts`.

### Implementation for User Story 3

- [X] T037 [US3] Implement required field, field type, enum, uniqueness, nested object, and array validation in `packages/core/src/generation/validate-generated-dataset.ts`.
- [X] T038 [US3] Implement missing collection, extra collection, and requested count validation in `packages/core/src/generation/validate-generated-dataset.ts`.
- [X] T039 [US3] Implement bounded retry orchestration with sanitized validation feedback in `packages/core/src/generation/generate-seed-data.ts`.
- [X] T040 [US3] Sanitize malformed output, provider failure, and validation failure messages in `apps/api/src/routes/generation.ts`.
- [X] T041 [US3] Show generation status, validation errors, retry failure summaries, and suggested actions in `apps/web/app/generate/page.tsx`.

**Checkpoint**: User Story 3 protects users from invalid or incomplete generated output.

---

## Phase 6: User Story 4 - Use Project Context for Realistic Values (Priority: P4)

**Goal**: Use project context and reviewed schema metadata to make generated values plausible while preserving schema validity.

**Independent Test**: Provide project context, generate records, and verify generated names, categories, statuses, amounts, and descriptions are plausible for the domain and still pass validation.

### Tests for User Story 4

- [X] T042 [P] [US4] Add core tests that provider requests include project context and schema constraints in `packages/core/src/generation/__tests__/generate-seed-data.test.ts`.
- [X] T043 [P] [US4] Add API contract tests for empty project context warning behavior in `apps/api/src/routes/__tests__/ai-seed-generation.contracts.test.ts`.

### Implementation for User Story 4

- [X] T044 [US4] Include project description, repository-derived context summary, reviewed field metadata, enum values, references, and warnings in provider requests in `packages/core/src/generation/generate-seed-data.ts`.
- [X] T045 [US4] Add generic-context warning generation when project context is empty in `packages/core/src/generation/generate-seed-data.ts`.
- [X] T046 [US4] Load saved project context and active schema snapshot for generation requests in `apps/api/src/routes/generation.ts`.
- [X] T047 [US4] Display domain realism warnings and low-confidence schema warnings in `apps/web/app/generate/page.tsx`.

**Checkpoint**: User Story 4 generates domain-aware records without weakening validation.

---

## Phase 7: User Story 5 - Refine Generated Dataset Through AI Chat (Priority: P5)

**Goal**: Provide an AI chat box for targeted generated-data refinements and non-mutating guidance while preserving the current valid dataset on invalid refinements.

**Independent Test**: Generate a valid dataset, submit a chat request such as `make user emails use a university domain`, and confirm the returned dataset reflects the change while preserving schema validity, uniqueness, and references.

### Tests for User Story 5

- [X] T048 [P] [US5] Add core tests for accepted chat refinements replacing only with validated datasets in `packages/core/src/generation/__tests__/refine-generated-dataset.test.ts`.
- [X] T049 [P] [US5] Add core tests for malformed, invalid, ambiguous, and non-mutating guidance refinement responses in `packages/core/src/generation/__tests__/refine-generated-dataset.test.ts`.
- [X] T050 [P] [US5] Add API contract tests for `POST /projects/:projectId/generations/refinements` updated dataset, guidance, and rejected responses in `apps/api/src/routes/__tests__/ai-seed-generation.contracts.test.ts`.

### Implementation for User Story 5

- [X] T051 [US5] Implement chat refinement orchestration with injected provider dependency in `packages/core/src/generation/refine-generated-dataset.ts`.
- [X] T052 [US5] Validate refined datasets with the existing dataset validator before accepting updates in `packages/core/src/generation/refine-generated-dataset.ts`.
- [X] T053 [US5] Preserve the current valid dataset when refinement output is malformed, invalid, unsafe, or rejected in `packages/core/src/generation/refine-generated-dataset.ts`.
- [X] T054 [US5] Support non-mutating guidance responses in `packages/core/src/generation/refine-generated-dataset.ts`.
- [X] T055 [US5] Add OpenAI-backed chat refinement provider adapter in `apps/api/src/routes/generation.ts`.
- [X] T056 [US5] Add authenticated `POST /projects/:projectId/generations/refinements` route handler in `apps/api/src/routes/generation.ts`.
- [X] T057 [US5] Add AI chat box, chat history, loading state, accepted update state, rejected refinement state, and guidance display in `apps/web/app/generate/page.tsx`.

**Checkpoint**: User Story 5 supports validated chat-based AI refinement.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Security, documentation, and final verification across all stories.

- [X] T058 [P] Update README setup and environment notes for `OPENAI_API_KEY` and AI seed generation workflow in `README.md`.
- [X] T059 [P] Add generated-dataset and chat-refinement quickstart notes to `docs/requirements.md`.
- [X] T060 Review API and core code for secret, prompt, raw provider error, and connection string exposure in `apps/api/src/routes/generation.ts`.
- [X] T061 Review dependency direction to ensure `packages/core` has no OpenAI, Express, Next.js, or Mongoose imports in `packages/core/src/generation/`.
- [X] T062 Run the feature quickstart validation from `specs/005-ai-seed-generation/quickstart.md`.
- [X] T063 Run full repository verification with `npx turbo build lint test` using scripts from `package.json`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1 and blocks all user stories.
- **Phase 3 US1 MVP**: Depends on Phase 2.
- **Phase 4 US2**: Depends on Phase 2; can run alongside US1 after shared contracts exist, but its UI/API behavior is easiest to validate after US1.
- **Phase 5 US3**: Depends on US1 generation orchestration and US2 count planning.
- **Phase 6 US4**: Depends on US1 provider orchestration.
- **Phase 7 US5**: Depends on US1 generated dataset shape and US3 validation.
- **Phase 8 Polish**: Depends on all selected user stories.

### User Story Dependencies

- **US1 Generate Valid Relational Seed Records**: MVP, no other story dependency after foundation.
- **US2 Choose Record Counts Per Collection**: Builds on shared planning contracts and can be implemented after foundation.
- **US3 Handle Invalid or Incomplete Generated Output**: Depends on US1 generation flow and validator structure.
- **US4 Use Project Context for Realistic Values**: Depends on US1 provider request construction.
- **US5 Refine Generated Dataset Through AI Chat**: Depends on US1 dataset shape and US3 validation rules.

### Within Each User Story

- Write tests first and confirm they fail.
- Implement core logic before API route behavior.
- Implement API route behavior before web client/UI integration.
- Complete each checkpoint before moving to lower-priority stories when working sequentially.

---

## Parallel Opportunities

- T001 through T005 can be split across team members because they create separate files/directories.
- T006 through T008 can be drafted in parallel inside `packages/types/src/generation.ts`, then merged carefully before T009 and T010.
- T015, T016, and T017 can run in parallel for US1 test coverage.
- T027 and T028 can run in parallel for US2 test coverage.
- T034, T035, and T036 can run in parallel for US3 test coverage.
- T042 and T043 can run in parallel for US4 test coverage.
- T048, T049, and T050 can run in parallel for US5 test coverage.
- T058 and T059 can run in parallel during polish.

---

## Parallel Example: User Story 1

```bash
Task: "T015 [P] [US1] Add core tests for parent-before-child dependency ordering in packages/core/src/generation/__tests__/build-generation-plan.test.ts"
Task: "T016 [P] [US1] Add core tests for generated ObjectId reference integrity in packages/core/src/generation/__tests__/validate-generated-dataset.test.ts"
Task: "T017 [P] [US1] Add API contract tests for POST /projects/:projectId/generations success response shape in apps/api/src/routes/__tests__/ai-seed-generation.contracts.test.ts"
```

## Parallel Example: User Story 5

```bash
Task: "T048 [P] [US5] Add core tests for accepted chat refinements replacing only with validated datasets in packages/core/src/generation/__tests__/refine-generated-dataset.test.ts"
Task: "T049 [P] [US5] Add core tests for malformed, invalid, ambiguous, and non-mutating guidance refinement responses in packages/core/src/generation/__tests__/refine-generated-dataset.test.ts"
Task: "T050 [P] [US5] Add API contract tests for POST /projects/:projectId/generations/refinements updated dataset, guidance, and rejected responses in apps/api/src/routes/__tests__/ai-seed-generation.contracts.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational contracts and wiring.
3. Complete Phase 3 US1.
4. Stop and validate parent-first generation, grouped JSON, and ObjectId reference integrity.
5. Demo the MVP before expanding counts, retry behavior, realism, or chat refinement.

### Incremental Delivery

1. Add US1 for valid relational generation.
2. Add US2 for user-selected collection counts and safe limits.
3. Add US3 for retry, validation hardening, and failure handling.
4. Add US4 for project-context realism.
5. Add US5 for AI chat refinement.
6. Complete polish, docs, security review, and full verification.

### Parallel Team Strategy

1. Team completes Setup and Foundational phases together.
2. After foundation:
   - Developer A: US1 core planning and validation.
   - Developer B: US2 count controls and planning checks.
   - Developer C: US3 validator/retry hardening.
   - Developer D: US5 chat refinement after the US1 dataset shape stabilizes.
3. Integrate through API contract tests and web build checks.

---

## Notes

- Keep OpenAI SDK construction and API key access in `apps/api`.
- Keep dependency ordering, validation, retry, and refinement orchestration in `packages/core`.
- Keep `apps/web` imports limited to `@testseed/types` from workspace packages.
- Never return raw prompts, raw provider errors, API keys, credentials, or connection strings.
- Commit after each task or logical group.
