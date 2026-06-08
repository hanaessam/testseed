# Feature Specification: Generation Workbench UX

**Feature Branch**: `006-generation-workbench`

**Created**: 2026-06-08

**Status**: Draft — documented before implementation; replaces the linear generate wizard in a later phase.

**Depends on**: `005-ai-seed-generation` (generation and refinement APIs), `004-schema-review`, `001-project-context-setup`, `003-mongodb-schema-discovery`

**Input**: Align TestSeed's data-generation user experience with agent-centric synthetic data tools such as [Tonic Fabricate](https://www.tonic.ai/products/fabricate) (see `research.md` and team reference: [demo video](https://www.youtube.com/watch?v=qAtGUNLav5k)).

## Problem

The current `/generate` flow is a **linear wizard** (project → GitHub → schema input → review → generate → refine). It works for first-time onboarding but diverges from modern synthetic-data products where users stay in one **workbench**: schema context, generation plan, live preview, chat refinement, and export coexist on a single screen.

Users who complete generation today see **raw JSON in a `<pre>` block**, must navigate to a **separate refine step**, and have **no export or insert surface** in the generation flow. That creates friction compared to tools where preview, iteration, and handoff feel continuous.

## Goal

Replace the wizard-centric generation UX with a **Generation Workbench** that:

1. Keeps schema setup accessible without blocking the main canvas.
2. Surfaces a **generation plan** before running AI generation.
3. Previews data in **per-collection tables**, not only JSON.
4. Integrates **chat refinement** beside the preview (no separate wizard step).
5. Provides a clear **finish / export** path into project history and downstream epics (export, direct insert).

**Non-goal for this epic**: Reimplement generation logic, validation rules, or OpenAI orchestration (owned by `005`). Streaming generation and dataset versioning are phased follow-ups within or after this epic (see `plan.md`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Workbench Entry and Resume (Priority: P1)

As an authenticated developer with a saved project, I want to open a single generation workbench so I can continue schema setup, generation, and refinement without walking through unrelated wizard steps.

**Why this priority**: The workbench shell is the foundation; without it, other UX improvements remain bolted onto the wizard.

**Independent Test**: Open `/generate?projectId={id}&mode=generate` for a project with a saved schema; confirm the workbench loads with schema summary, counts, and generate action visible without stepping through GitHub or schema-choose cards.

**Acceptance Scenarios**:

1. **Given** a project with a saved schema snapshot, **When** the user opens generate mode for that project, **Then** the workbench opens with schema summary, per-collection counts, and a primary generate action.
2. **Given** a project without a saved schema, **When** the user opens the workbench, **Then** a setup panel prompts for schema input (paste, upload, or MongoDB) without hiding the workbench frame.
3. **Given** the user arrived from project overview or projects list, **When** they click Generate or Add schema, **Then** they land in the same workbench route with project context loaded.

---

### User Story 2 - Generation Plan Before Run (Priority: P1)

As a developer, I want to see how TestSeed will generate data (collection order, references, counts, warnings) before starting AI generation so I trust referential integrity.

**Why this priority**: Tonic-style products expose planning; TestSeed already computes dependency order in core but does not show it in the UI.

**Independent Test**: Load a schema with parent and child collections; confirm the plan lists generation order, reference edges, and blocking warnings before the user clicks Generate.

**Acceptance Scenarios**:

1. **Given** a reviewed schema with reference fields, **When** the user views the workbench, **Then** the generation plan shows collection order consistent with parent-before-child rules.
2. **Given** a plan with blocking issues (zero parent count, missing referenced collection, cycle), **When** the user views the plan, **Then** warnings explain the issue and generation is disabled or clearly risky until resolved.
3. **Given** the user changes per-collection counts, **When** counts update, **Then** the plan reflects the new totals and expected record count.

---

### User Story 3 - Table Preview and Validation Feedback (Priority: P1)

As a developer, I want to preview generated records in per-collection tables with validation status so I can inspect realistic data faster than reading raw JSON.

**Why this priority**: Table preview is the largest perceived UX gap versus Tonic-style demos.

**Independent Test**: Generate a valid dataset; switch collection tabs; confirm rows match schema fields and validation badges match API validation results.

**Acceptance Scenarios**:

1. **Given** a successful generation, **When** results load, **Then** each collection appears in a tab or list with columns derived from the reviewed schema.
2. **Given** validation warnings or errors, **When** results are shown, **Then** the UI surfaces collection/field-level messages without exposing raw provider output.
3. **Given** reference fields (ObjectId), **When** the user inspects a row, **Then** referenced values are identifiable (mono style or link hint) without breaking the dark UI patterns in `docs/ui-design.md`.

---

### User Story 4 - Integrated Chat Refinement (Priority: P2)

As a developer, I want to refine generated data via a chat panel on the same screen so I can iterate without changing wizard steps.

**Why this priority**: Refinement API exists (`005`); the workbench only relocates and improves the UX.

**Independent Test**: Generate data, send a chat instruction in the agent dock, confirm the table preview updates when refinement succeeds and stays unchanged when refinement fails.

**Acceptance Scenarios**:

1. **Given** a valid generated dataset displayed in the workbench, **When** the user submits a refinement message, **Then** the chat dock shows progress and appends user/assistant messages.
2. **Given** a successful refinement, **When** validation passes, **Then** the table preview replaces data and shows a brief success summary.
3. **Given** a failed refinement, **When** validation fails, **Then** the previous valid dataset remains visible and the user sees an actionable error.
4. **Given** the user asks a non-mutating question, **When** the API returns guidance only, **Then** the dataset is unchanged.

---

### User Story 5 - Finish, Export, and Project Handoff (Priority: P2)

As a developer, I want a clear finish state from the workbench so I can export data or return to the project with confidence that the batch is saved in history.

**Why this priority**: Completes the loop started in generation; aligns with `docs/requirements.md` export and project history epics.

**Independent Test**: After generation, use Finish; confirm navigation to project detail and history reflects the generation event. When export drawer is implemented, confirm JSON download is blocked if dataset is invalid.

**Acceptance Scenarios**:

1. **Given** a valid dataset, **When** the user clicks Finish, **Then** client-side navigation opens the project detail page without a full document reload error.
2. **Given** export is available in the workbench, **When** the dataset is invalid, **Then** export actions are disabled with validation explanation.
3. **Given** a valid dataset, **When** the user downloads JSON, **Then** the file matches the grouped-by-collection structure from the API.

---

### User Story 6 - Collapsible Setup (Context, GitHub, Schema) (Priority: P3)

As a new user, I still want guided setup for project context, GitHub, and schema input, but as collapsible sections that do not replace the workbench layout.

**Acceptance Scenarios**:

1. **Given** a new project, **When** the user expands Setup, **Then** they can complete project description, optional GitHub connect, and schema input using existing flows.
2. **Given** GitHub OAuth returns to generate, **When** the callback loads, **Then** the user remains in the workbench with repository context visible in the setup rail.
3. **Given** setup is complete, **When** the user collapses Setup, **Then** the data canvas and agent dock gain horizontal space.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Generation Workbench route that supersedes the linear wizard for returning users with saved projects.
- **FR-002**: Workbench MUST show schema snapshot summary (version, collection count, field count) when available.
- **FR-003**: Workbench MUST allow per-collection record count editing and display total requested records before generation.
- **FR-004**: Workbench MUST display a generation plan derived from core dependency ordering before generation starts.
- **FR-005**: Workbench MUST call existing authenticated generation and refinement APIs; no business logic in `apps/web`.
- **FR-006**: Workbench MUST render generated records in per-collection table views, not JSON alone.
- **FR-007**: Workbench MUST keep chat refinement in the same view as preview after the first valid dataset exists.
- **FR-008**: Workbench MUST preserve all `005` validation and security rules (no prompts, secrets, or raw provider errors in UI).
- **FR-009**: Workbench MUST use client-side navigation (`Link` or `router.push`) for internal routes to avoid dev/prod navigation failures.
- **FR-010**: Workbench SHOULD provide quick-refinement prompt chips for common requests (domain realism, email patterns, numeric variance).
- **FR-011**: Workbench SHOULD expose a finish/export action area (drawer or sticky bar) for JSON download in Phase 2.
- **FR-012**: Workbench MAY retain the legacy wizard behind a feature flag or redirect only for net-new projects until Phase 1 is stable.

### Key Entities

- **Generation Workbench Session**: UI state for active project, schema snapshot, counts, plan, dataset, chat history, and validation results.
- **Generation Plan View**: Read-only presentation of `CollectionGenerationPlan` items and dependency warnings.
- **Collection Table View**: Tabular projection of `GeneratedDataset` records for one collection.
- **Agent Dock**: Chat transcript, input, refinement status, and quick prompts.

## Success Criteria *(mandatory)*

- **SC-001**: Users with a saved schema reach the generate action in one navigation from project overview (no more than one optional setup expand).
- **SC-002**: 100% of generation plans shown in UI match core dependency order for acceptance-tested schemas.
- **SC-003**: Users can complete generate → refine → finish without using a separate wizard step for refinement.
- **SC-004**: Table preview renders within 1 second of API response for demo-sized datasets (≤ 500 total records).
- **SC-005**: Zero full-page `<a href>` navigations from workbench finish actions to project routes.

## Assumptions

- `005` generation and refinement endpoints remain the source of truth for data mutations.
- Export script generation and direct MongoDB insert remain separate implementation tasks but share the workbench finish surface.
- Streaming partial results (Phase 3 in `plan.md`) are optional and not required for initial workbench release.
- Mobile view may collapse the three-pane layout into stacked sections; desktop is the primary design target.

## Out of Scope (this epic)

- SQL or non-MongoDB export formats.
- Multi-database projects per Tonic "Projects" workspace model.
- Mock API generation.
- Replacing core validation or OpenAI prompt design.

## Related Documentation

- `specs/006-generation-workbench/plan.md` — phased implementation
- `specs/006-generation-workbench/research.md` — Tonic Fabricate UX comparison
- `docs/ui-design.md` — current wizard vs planned workbench layout
- `docs/generation-ux-roadmap.md` — executive summary and epic map
