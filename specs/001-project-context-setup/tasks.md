# Tasks: Project Context Setup

**Input**: Design documents from `specs/001-project-context-setup/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/project-context-api.md, quickstart.md

**Tests**: Included because `packages/core/AGENTS.md` requires every exported core function to be tested with Jest, and API contract coverage already exists as a local pattern.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on another incomplete task in the same phase.
- **[Story]**: Maps to user stories from `spec.md`.
- Every task includes exact file paths.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared contracts and feature-owned folders used by all stories.

- [X] T001 Add ProjectContext, RepositoryContextSource, ContextWarning, request/response types, and project event kinds in `packages/types/src/projects.ts`
- [X] T002 Re-export project context request/response contracts in `packages/types/src/api.ts`
- [X] T003 [P] Create project context component folder with an index placeholder in `apps/web/components/project-context/index.ts`
- [X] T004 [P] Add project-context use case folder barrel in `packages/core/src/projects/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core persistence and shared API shape that MUST be complete before user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Extend the Project persistence model with optional context fields in `packages/db/src/models/project.ts`
- [X] T006 Extend project repository create/update/read mapping for context fields in `packages/db/src/repositories/project-repository.ts`
- [X] T007 Add project context repository method signatures for save/remove context in `packages/db/src/repositories/project-repository.ts`
- [X] T008 Update project DTO date normalization for nested context dates in `apps/web/src/lib/api-client.ts`
- [X] T009 Add project context event kinds to project history payload handling in `packages/types/src/projects.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Describe Project Domain (Priority: P1) MVP

**Goal**: Authenticated users can enter, save, update, and continue with a plain-language project description, including empty-description warnings.

**Independent Test**: Enter an e-commerce description on the generation flow, save/continue, and confirm project detail exposes the saved context for future generation.

### Tests for User Story 1

> Write these tests FIRST and confirm they fail before implementation.

- [X] T010 [P] [US1] Add core tests for trimming descriptions, empty-description warning, owner authorization, and length validation in `packages/core/src/projects/__tests__/project-context.test.ts`
- [X] T011 [P] [US1] Add API contract tests for `PUT /projects/:projectId/context` owner success and unauthorized project access in `apps/api/src/routes/__tests__/project-context.contracts.test.ts`

### Implementation for User Story 1

- [X] T012 [US1] Implement updateProjectContext core use case in `packages/core/src/projects/update-project-context.ts`
- [X] T013 [US1] Export updateProjectContext from `packages/core/src/projects/index.ts`
- [X] T014 [US1] Wire project context repository update into `packages/db/src/repositories/project-repository.ts`
- [X] T015 [US1] Add Zod validation and `PUT /projects/:projectId/context` route in `apps/api/src/routes/projects.ts`
- [X] T016 [US1] Add `updateProjectContext` API client method in `apps/web/src/lib/api-client.ts`
- [X] T017 [P] [US1] Create reusable description form UI in `apps/web/components/project-context/project-context-form.tsx`
- [X] T018 [US1] Integrate description context save/update into `apps/web/app/generate/page.tsx`
- [X] T019 [US1] Display saved project context description and warnings in `apps/web/app/projects/[projectId]/page.tsx`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Add Optional Repository Context (Priority: P2)

**Goal**: Authenticated users can connect repository context through a one-operation GitHub authorization flow, store summary/warnings only, and continue when repository context fails.

**Independent Test**: Enter a repository full name, authorize access, return to the project, and confirm the saved project context includes only repository summary/warnings; failed repository attempts leave description-only context usable.

### Tests for User Story 2

> Write these tests FIRST and confirm they fail before implementation.

- [X] T020 [P] [US2] Add core tests for repository full-name validation, relevant-file filtering, summary-only storage, warning statuses, and token exclusion in `packages/core/src/projects/__tests__/repository-context.test.ts`
- [X] T021 [P] [US2] Add API contract tests for GitHub repository authorization start and callback failure paths in `apps/api/src/routes/__tests__/project-context-github.contracts.test.ts`

### Implementation for User Story 2

- [X] T022 [US2] Implement repository context ports and filtering helpers in `packages/core/src/projects/connect-repository-context.ts`
- [X] T023 [US2] Implement GitHub repository context authorization URL creation in `packages/core/src/projects/start-repository-context-authorization.ts`
- [X] T024 [US2] Export repository context use cases from `packages/core/src/projects/index.ts`
- [X] T025 [US2] Add repository context persistence/remove methods in `packages/db/src/repositories/project-repository.ts`
- [X] T026 [US2] Add API config values for GitHub repository callback and web redirect in `apps/api/src/index.ts`
- [X] T027 [US2] Add `POST /projects/:projectId/context/github/authorize` route in `apps/api/src/routes/projects.ts`
- [X] T028 [US2] Add shared GitHub callback handling with transient token exchange and repository summary persistence in `apps/api/src/routes/auth.ts` and `apps/api/src/routes/projects.ts`
- [X] T029 [US2] Add repository context API client method for authorization start in `apps/web/src/lib/api-client.ts`
- [X] T030 [P] [US2] Create repository context UI controls in `apps/web/components/project-context/repository-context-panel.tsx`
- [X] T031 [US2] Integrate repository authorization start and warning display into `apps/web/app/projects/[projectId]/page.tsx`
- [X] T032 [US2] Add repository context status handling on `apps/web/app/generate/page.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Review Context Before Generation (Priority: P3)

**Goal**: Authenticated users can review, correct, and remove context before seed generation uses it.

**Independent Test**: Open project detail or generation setup, review description and repository status, edit the description or remove repository context, and confirm the updated context is reflected before generation continues.

### Tests for User Story 3

> Write these tests FIRST and confirm they fail before implementation.

- [X] T033 [P] [US3] Add core tests for removing repository context and preventing stale repository-derived summary usage in `packages/core/src/projects/__tests__/project-context.test.ts`
- [X] T034 [P] [US3] Add API contract tests for `DELETE /projects/:projectId/context/github` in `apps/api/src/routes/__tests__/project-context.contracts.test.ts`

### Implementation for User Story 3

- [X] T035 [US3] Implement removeRepositoryContext core use case in `packages/core/src/projects/remove-repository-context.ts`
- [X] T036 [US3] Export removeRepositoryContext from `packages/core/src/projects/index.ts`
- [X] T037 [US3] Add `DELETE /projects/:projectId/context/github` route in `apps/api/src/routes/projects.ts`
- [X] T038 [US3] Add remove repository context API client method in `apps/web/src/lib/api-client.ts`
- [X] T039 [US3] Add context review summary component in `apps/web/components/project-context/project-context-summary.tsx`
- [X] T040 [US3] Integrate context review, edit, and remove actions into `apps/web/app/projects/[projectId]/page.tsx`
- [X] T041 [US3] Ensure generation setup reads latest saved context before schema parsing in `apps/web/app/generate/page.tsx`

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, documentation, and security checks across the full feature.

- [X] T042 [P] Update `.env.example` with repository-context GitHub callback variable if a new env var is introduced in `apps/api/src/index.ts`
- [X] T043 [P] Update README GitHub section for repository context authorization and summary-only storage in `README.md`
- [X] T044 [P] Update web design notes for project context controls if UI behavior diverges from existing guidance in `docs/ui-design.md`
- [X] T045 Run quickstart scenario and record any manual verification notes in `specs/001-project-context-setup/quickstart.md`
- [X] T046 Run full verification with `npx turbo build lint test`
- [X] T047 Review changed files for secret/token/raw-file persistence risks across `packages/core/src/projects`, `apps/api/src/routes/projects.ts`, and `packages/db/src/models/project.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; MVP scope.
- **User Story 2 (Phase 4)**: Depends on Foundational and may reuse context display from US1, but remains optional.
- **User Story 3 (Phase 5)**: Depends on Foundational and benefits from US1/US2 data, but remove/review behavior remains independently testable with seeded context.
- **Polish (Phase 6)**: Depends on selected stories being complete.

### User Story Dependencies

- **US1 Describe Project Domain**: No dependency on US2 or US3.
- **US2 Add Optional Repository Context**: Requires project context foundation; no hard dependency on generated seed data.
- **US3 Review Context Before Generation**: Requires context read/update/remove APIs; should be validated after US1 and US2 for the full review flow.

### Within Each User Story

- Tests before implementation.
- Types and repository mapping before core use cases.
- Core use cases before API routes.
- API client methods before UI integration.
- Story checkpoint before moving to the next priority.

---

## Parallel Opportunities

- T003 and T004 can run in parallel after T001/T002 are understood.
- T010 and T011 can run in parallel because they cover different test files.
- T017 can run in parallel with T012-T016 after shared types exist.
- T020 and T021 can run in parallel because they cover different test files.
- T030 can run in parallel with API route implementation after API client shape is known.
- T033 and T034 can run in parallel because they cover different test concerns.
- T042, T043, and T044 can run in parallel during polish.

## Parallel Example: User Story 1

```text
Task: "Add core tests for trimming descriptions, empty-description warning, owner authorization, and length validation in packages/core/src/projects/__tests__/project-context.test.ts"
Task: "Add API contract tests for PUT /projects/:projectId/context owner success and unauthorized project access in apps/api/src/routes/__tests__/project-context.contracts.test.ts"
Task: "Create reusable description form UI in apps/web/components/project-context/project-context-form.tsx"
```

## Parallel Example: User Story 2

```text
Task: "Add core tests for repository full-name validation, relevant-file filtering, summary-only storage, warning statuses, and token exclusion in packages/core/src/projects/__tests__/repository-context.test.ts"
Task: "Add API contract tests for GitHub repository authorization start and callback failure paths in apps/api/src/routes/__tests__/project-context-github.contracts.test.ts"
Task: "Create repository context UI controls in apps/web/components/project-context/repository-context-panel.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational persistence and shared DTO work.
3. Complete Phase 3 User Story 1.
4. Validate project description save/update independently with tests and the `/generate` to project detail flow.

### Incremental Delivery

1. Deliver US1 as the MVP context value path.
2. Add US2 for optional GitHub repository context without blocking description-only workflows.
3. Add US3 for review/remove/correct context before generation.
4. Finish polish and security validation.

### Guardrails

- Do not store GitHub access tokens or raw repository files.
- Do not put repository filtering, warning, or summary decisions in `apps/web` or route handlers.
- Do not import `@testseed/core` or `@testseed/db` into `apps/web`.
- Do not import Express, Next.js, or Mongoose into `packages/core`.
- Keep all web server communication in `apps/web/src/lib/api-client.ts`.
