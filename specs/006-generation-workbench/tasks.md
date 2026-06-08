# Tasks: Generation Workbench UX

**Input**: Design documents from `specs/006-generation-workbench/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Contract tests included for new plan and streaming endpoints per `plan.md` verification requirements. No full TDD unless a task explicitly adds a failing test first.

**Organization**: Phase 1 user stories (US1–US7) deliver the workbench shell. Plan Phase 2a (streaming) and 2b (export) follow as separate task phases aligned with `plan.md`.

**Status**: All tasks below are complete. Post-006 enhancements in codebase (not separate tasks): setup wizard component, saved runs with chat history, collection counts panel, refinement prompt improvements. Next epic: **`007-preview-editing`**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies).
- **[Story]**: Maps to user stories in `spec.md` (US1–US7).
- Every task includes exact file paths.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold workbench component files and test harness.

- [X] T001 Create `apps/web/components/generation/` directory structure per `specs/006-generation-workbench/plan.md`
- [X] T002 [P] Create `apps/web/components/generation/generation-workbench.tsx` three-pane layout shell
- [X] T003 [P] Create `apps/web/components/generation/setup-rail.tsx` collapsible container stub
- [X] T004 [P] Create `apps/web/components/generation/generation-plan-panel.tsx` stub
- [X] T005 [P] Create `apps/web/components/generation/context-sources-panel.tsx` stub
- [X] T006 [P] Create `apps/web/components/generation/collection-data-table.tsx` stub
- [X] T007 [P] Create `apps/web/components/generation/agent-dock.tsx` stub
- [X] T008 [P] Create `apps/api/src/routes/__tests__/generation-workbench.contracts.test.ts` test file scaffold

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, plan API, client wiring, and workbench entry — **blocks all user stories**.

**CRITICAL**: No user story work until this phase completes.

- [X] T009 Add `GenerationPlanResponse` and related plan view types in `packages/types/src/generation.ts`
- [X] T010 Export new plan types from `packages/types/src/index.ts`
- [X] T011 Implement `buildGenerationPlanForProject` adapter helper in `apps/api/src/routes/generation.ts` delegating to `@testseed/core`
- [X] T012 Implement `GET /projects/:projectId/generation-plan` in `apps/api/src/routes/generation.ts` per `specs/006-generation-workbench/contracts/generation-plan-api.md`
- [X] T013 [P] Add contract tests for generation-plan success and error responses in `apps/api/src/routes/__tests__/generation-workbench.contracts.test.ts`
- [X] T014 Add `getGenerationPlan` method in `apps/web/src/lib/api-client.ts`
- [X] T015 Add workbench session state types in `apps/web/src/lib/generation-workbench-state.ts` per `specs/006-generation-workbench/data-model.md`
- [X] T016 Wire `GenerationWorkbench` as default render path in `apps/web/app/generate/page.tsx`

**Checkpoint**: Plan API and workbench shell entry are ready.

---

## Phase 3: User Story 1 — Workbench Entry and Resume (Priority: P1) MVP

**Goal**: All users land in a single workbench; returning users resume with schema summary and generate action visible.

**Independent Test**: Open `/generate?projectId={id}&mode=generate` for a project with saved schema; confirm workbench loads without wizard steps.

### Implementation for User Story 1

- [X] T017 [US1] Load project and active schema snapshot on workbench mount in `apps/web/app/generate/page.tsx`
- [X] T018 [US1] Implement `?projectId=` and `mode=generate` resume behavior in `apps/web/app/generate/page.tsx`
- [X] T019 [US1] Render schema summary, collection counts, and primary Generate action in `apps/web/components/generation/generation-workbench.tsx`
- [X] T020 [US1] Show setup prompt for missing schema without hiding workbench frame in `apps/web/components/generation/setup-rail.tsx`
- [X] T021 [US1] Remove Stepper-based wizard as default navigation from `apps/web/app/generate/page.tsx`
- [X] T022 [US1] Redirect unauthenticated users to login from `apps/web/app/generate/page.tsx`

**Checkpoint**: User Story 1 MVP — workbench entry and resume work without wizard.

---

## Phase 4: User Story 5 — Context-Informed Generation (Priority: P1)

**Goal**: Surface active project description and GitHub repository summary; ensure both flow into generate and refine requests.

**Independent Test**: Project with description and connected repo shows context chips; generated values reflect domain; refine includes same context.

### Implementation for User Story 5

- [X] T023 [P] [US5] Implement `ContextSourcesPanel` with description and repository labels in `apps/web/components/generation/context-sources-panel.tsx`
- [X] T024 [US5] Load project context from project detail in `apps/web/app/generate/page.tsx`
- [X] T025 [US5] Mount `ContextSourcesPanel` in setup rail before Generate in `apps/web/components/generation/setup-rail.tsx`
- [X] T026 [US5] Pass project context fields through `generateSeedData` calls in `apps/web/src/lib/api-client.ts` usage in `apps/web/app/generate/page.tsx`
- [X] T027 [US5] Pass project context fields through `refineGeneratedDataset` calls in `apps/web/app/generate/page.tsx`
- [X] T028 [US5] Show generic-context warning when description and repository are both empty in `apps/web/components/generation/context-sources-panel.tsx`

**Checkpoint**: Context visibility and API payload preservation work.

---

## Phase 5: User Story 2 — Generation Plan Before Run (Priority: P1)

**Goal**: Display collection order, references, counts, and soft-warn on blocking issues without disabling Generate.

**Independent Test**: Parent/child schema shows correct order; cycle or zero-parent shows risk notice; Generate stays enabled.

### Implementation for User Story 2

- [X] T029 [US2] Fetch plan via `getGenerationPlan` when counts change in `apps/web/components/generation/generation-plan-panel.tsx`
- [X] T030 [US2] Render ordered collections, reference edges, and warnings in `apps/web/components/generation/generation-plan-panel.tsx`
- [X] T031 [US2] Display total requested records in `apps/web/components/generation/generation-plan-panel.tsx`
- [X] T032 [US2] Add prominent risk notice when `riskLevel` is elevated without disabling Generate in `apps/web/components/generation/generation-plan-panel.tsx`
- [X] T033 [US2] Mount plan panel in setup rail in `apps/web/components/generation/generation-workbench.tsx`

**Checkpoint**: Generation plan visible with soft-warn behavior.

---

## Phase 6: User Story 3 — Table Preview and Validation Feedback (Priority: P1)

**Goal**: Per-collection tables after full generation (Phase 1 batch); validation surfaced without raw provider output.

**Independent Test**: Generate valid dataset; switch collection tabs; rows match schema; validation messages visible.

### Implementation for User Story 3

- [X] T034 [US3] Implement collection tabs from reviewed schema in `apps/web/components/generation/collection-data-table.tsx`
- [X] T035 [US3] Derive table columns from `ParsedSchema` fields in `apps/web/components/generation/collection-data-table.tsx`
- [X] T036 [US3] Add paginated row rendering in `apps/web/components/generation/collection-data-table.tsx`
- [X] T037 [US3] Wire batch `POST /generations` response to populate tables in `apps/web/app/generate/page.tsx`
- [X] T038 [US3] Surface collection and field validation messages in `apps/web/components/generation/collection-data-table.tsx`
- [X] T039 [US3] Style reference identifier fields distinctly in `apps/web/components/generation/collection-data-table.tsx`
- [X] T040 [US3] Show empty and error states in data canvas in `apps/web/components/generation/generation-workbench.tsx`

**Checkpoint**: Static table preview works after full generation response.

---

## Phase 7: User Story 4 — Integrated Chat Refinement (Priority: P2)

**Goal**: Refine on same screen via agent dock; batch mode in Phase 1; preserve dataset on failure; cancel on navigate away.

**Independent Test**: Refine succeeds → tables update; fails → dataset unchanged; navigate away cancels in-flight refine.

### Implementation for User Story 4

- [X] T041 [US4] Implement chat transcript, input, and submit in `apps/web/components/generation/agent-dock.tsx`
- [X] T042 [US4] Wire batch refinement API and update tables on success in `apps/web/app/generate/page.tsx`
- [X] T043 [US4] Preserve last valid dataset on refinement validation failure in `apps/web/app/generate/page.tsx`
- [X] T044 [US4] Handle guidance-only responses without mutating dataset in `apps/web/app/generate/page.tsx`
- [X] T045 [US4] Add `AbortController` cancel for in-flight refinement on route change in `apps/web/app/generate/page.tsx`
- [X] T046 [US4] Disable agent dock until valid dataset exists in `apps/web/components/generation/agent-dock.tsx`
- [X] T047 [US4] Mount agent dock in `apps/web/components/generation/generation-workbench.tsx`

**Checkpoint**: Merged refine works in batch mode on one screen.

---

## Phase 8: User Story 6 — Finish and Project Handoff (Priority: P2)

**Goal**: Finish navigates to project detail; no export in Phase 1.

**Independent Test**: Click Finish after valid dataset → project detail loads; no export UI present.

### Implementation for User Story 6

- [X] T048 [US6] Add sticky action bar with Generate and Finish in `apps/web/components/generation/generation-workbench.tsx`
- [X] T049 [US6] Implement Finish via `router.push` to `/projects/[projectId]` in `apps/web/app/generate/page.tsx`
- [X] T050 [US6] Omit export controls from sticky bar in Phase 1 in `apps/web/components/generation/generation-workbench.tsx`
- [X] T051 [US6] Disable Generate during in-flight operations in `apps/web/app/generate/page.tsx`

**Checkpoint**: Finish handoff works; export absent.

---

## Phase 9: User Story 7 — Collapsible Setup (Priority: P3)

**Goal**: Net-new users complete context, GitHub, and schema flows inside collapsible setup rail.

**Independent Test**: New project → expand Setup → complete flows → collapse → canvas gains space; GitHub callback stays in workbench.

### Implementation for User Story 7

- [X] T052 [US7] Extract project description form from wizard into `apps/web/components/generation/setup-rail.tsx`
- [X] T053 [US7] Extract GitHub connect section into `apps/web/components/generation/setup-rail.tsx`
- [X] T054 [US7] Extract schema choose, input, review, and save flows into `apps/web/components/generation/setup-rail.tsx`
- [X] T055 [US7] Handle GitHub OAuth callback within workbench context in `apps/web/app/generate/page.tsx`
- [X] T056 [US7] Implement collapsible expand/collapse with persisted preference in `apps/web/components/generation/setup-rail.tsx`
- [X] T057 [US7] Stack panes on small viewports in `apps/web/components/generation/generation-workbench.tsx`

**Checkpoint**: Phase 1 complete per `specs/006-generation-workbench/plan.md` exit criteria.

---

## Phase 10: Plan Phase 2a — Streaming UX

**Goal**: Streamed chat tokens and progressive per-collection tables ([Tonic demo](https://www.youtube.com/watch?v=qAtGUNLav5k)) before export.

**Independent Test**: Multi-collection generate shows first collection rows before last completes; refinement chat streams within ~2s.

### Tests for Phase 2a

- [X] T058 [P] Add contract tests for `POST /generations/stream` SSE events in `apps/api/src/routes/__tests__/generation-workbench.contracts.test.ts`
- [X] T059 [P] Add contract tests for `POST /generations/refinements/stream` SSE events in `apps/api/src/routes/__tests__/generation-workbench.contracts.test.ts`

### Implementation for Phase 2a

- [X] T060 Add per-collection emit callback to `generateSeedData` in `packages/core/src/generation/generate-seed-data.ts`
- [X] T061 Implement `POST /projects/:projectId/generations/stream` SSE in `apps/api/src/routes/generation.ts` per `specs/006-generation-workbench/contracts/generation-workbench-streaming.md`
- [X] T062 Add stream token callback to `refineGeneratedDataset` in `packages/core/src/generation/refine-generated-dataset.ts`
- [X] T063 Implement `POST /projects/:projectId/generations/refinements/stream` SSE in `apps/api/src/routes/generation.ts`
- [X] T064 [P] Create SSE client helpers in `apps/web/src/lib/generation-stream.ts`
- [X] T065 [P] Create `apps/web/components/generation/generation-progress.tsx` per-collection status UI
- [X] T066 Wire `collection_complete` events to progressive tables in `apps/web/app/generate/page.tsx`
- [X] T067 Wire `token` events to streamed assistant messages in `apps/web/components/generation/agent-dock.tsx`
- [X] T068 Cancel in-flight generation stream on navigate away in `apps/web/app/generate/page.tsx`
- [X] T069 Add batch-endpoint fallback when stream returns `501` in `apps/web/src/lib/generation-stream.ts`

**Checkpoint**: SC-006 and SC-007 streaming criteria met.

---

## Phase 11: Plan Phase 2b — Export and Trust

**Goal**: JSON export, validation badges, quick prompts after streaming ships.

**Independent Test**: Valid dataset exports JSON; invalid dataset blocks export; badges match validation.

### Implementation for Phase 2b

- [X] T070 [P] Create `apps/web/components/generation/export-drawer.tsx`
- [X] T071 Add JSON download and clipboard copy in `apps/web/components/generation/export-drawer.tsx`
- [X] T072 Block export when dataset status is invalid in `apps/web/components/generation/export-drawer.tsx`
- [X] T073 Add inline validation badges on rows and cells in `apps/web/components/generation/collection-data-table.tsx`
- [X] T074 Add quick-refinement prompt chips in `apps/web/components/generation/agent-dock.tsx`
- [X] T075 Show refinement success summary in `apps/web/components/generation/agent-dock.tsx`
- [X] T076 Add optional dataset version label (v1, v2) in `apps/web/src/lib/generation-workbench-state.ts` and display in `apps/web/components/generation/generation-workbench.tsx`
- [X] T077 Add History tab link on finish bar in `apps/web/components/generation/generation-workbench.tsx`

**Checkpoint**: Phase 2b export and trust features complete.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, verification, cleanup.

- [X] T078 [P] Update workbench layout and tokens in `docs/ui-design.md`
- [X] T079 [P] Mark wizard section deprecated in `docs/ui-design.md`
- [X] T080 Remove unused wizard-only orchestration code from `apps/web/app/generate/page.tsx` after Phase 1 QA
- [X] T081 Run Phase 1 manual tests from `specs/006-generation-workbench/quickstart.md`
- [X] T082 Run `npx turbo build lint test` from repository root

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Setup (1) → Foundational (2) → US1 (3) → US5 (4) → US2 (5) → US3 (6) → US4 (7) → US6 (8) → US7 (9)
  → Phase 2a Streaming (10) → Phase 2b Export (11) → Polish (12)
```

### User Story Dependencies

| Story | Depends on | Notes |
| --- | --- | --- |
| US1 | Foundational | MVP entry point |
| US5 | US1 | Context panel in setup rail |
| US2 | US1, Foundational (plan API) | Counts from workbench state |
| US3 | US1, US2 | Needs generate wired |
| US4 | US3 | Needs valid dataset in canvas |
| US6 | US3 | Finish after generate |
| US7 | US1 | Setup rail extraction |
| Phase 2a | US3, US4 | Replaces batch with stream |
| Phase 2b | Phase 2a | Export after streaming per clarify |

### Parallel Opportunities

**Phase 1 Setup**: T002–T008 all [P]

**After Foundational**:

```text
# Parallel component work early (after T016):
T023 [US5] context-sources-panel.tsx
T029 [US2] generation-plan-panel.tsx
T034 [US3] collection-data-table.tsx
```

**Phase 2a tests**: T058, T059 in parallel

**Phase 2a client**: T064, T065 in parallel

---

## Parallel Example: Foundational + Components

```bash
# After T016, different developers:
Developer A: T023–T028 [US5] context-sources-panel.tsx
Developer B: T029–T033 [US2] generation-plan-panel.tsx
Developer C: T034–T040 [US3] collection-data-table.tsx
```

---

## Implementation Strategy

### MVP First (Phase 1 through US1 + US3 minimum)

1. Complete Phase 1 Setup + Phase 2 Foundational
2. Complete US1 (workbench entry)
3. Complete US3 (tables) with minimal US2 plan display
4. **STOP and VALIDATE** against Phase 1 quickstart
5. Add US5, US4, US6, US7 for full Phase 1 exit criteria

### Incremental Delivery

| Milestone | Phases | User-visible outcome |
| --- | --- | --- |
| MVP shell | 1–3 | Workbench loads; resume works |
| Phase 1 | 1–9 | Full workbench; batch generate/refine/finish |
| Phase 2a | 10 | Streaming chat + progressive tables |
| Phase 2b | 11 | JSON export + validation badges |
| Polish | 12 | Docs + CI green |

### Suggested first sprint scope

**T001–T022** (Setup + Foundational + US1) — demo workbench entry for all users.

---

## Notes

- Do not add business logic in `apps/web`; render API/SSE state only.
- Use `router.push` or `Link` for Finish — never `<a href>` to internal routes.
- Phase 1 uses batch `005` endpoints; streaming is additive in Phase 10.
- `packages/core` owns plan ordering and stream emit hooks; API adapts only.
