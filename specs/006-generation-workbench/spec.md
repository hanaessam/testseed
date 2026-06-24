# Feature Specification: Generation Workbench

**Feature Branch**: `006-generation-workbench`

**Created**: 2026-06-08

**Status**: Shipped

**Input**: User description: "generation workbench"

**Depends on**: AI seed generation (generate and refine capabilities), schema review, project context setup, and MongoDB schema discovery.

## Problem

The current generate flow is a **linear wizard** (project → optional GitHub → schema input → review → generate → refine). It works for first-time onboarding but diverges from modern synthetic-data products where users stay in one **workbench**: schema context, generation plan, live preview, chat refinement, and export coexist on a single screen.

Users who complete generation today see **raw JSON only**, must navigate to a **separate refine step**, and have **no export or insert surface** in the generation flow. That creates friction compared to tools where preview, iteration, and handoff feel continuous.

## Goal

Replace the wizard-centric generation experience with a **Generation Workbench** that:

1. Keeps schema setup accessible without blocking the main canvas.
2. Surfaces a **generation plan** before running AI generation.
3. Previews data in **per-collection tables**, not only JSON.
4. Integrates **chat refinement** beside the preview (no separate wizard step).
5. Provides a clear **finish / export** path into project history and downstream capabilities (export, direct insert).

**Non-goal for this epic**: Reimplement generation logic, validation rules, or AI orchestration (owned by the AI seed generation epic). Streaming ships Phase 2a; export Phase 2b (see `plan.md`).

## Clarifications

### Session 2026-06-08

- Q: Who sees the workbench vs the legacy wizard in Phase 1? → A: All users land in the workbench in Phase 1; net-new users complete setup via the collapsible left rail (no separate wizard flow).
- Q: How should blocking generation plan issues affect the Generate action? → A: Soft warn — Generate stays enabled with a prominent risk warning; user may proceed at own risk.
- Q: Is export in Phase 1 scope? → A: Phase 1 Finish only — Finish navigates to project; JSON export deferred to Phase 2.
- Q: Should generation use project and GitHub context in the AI prompt? → A: Yes — when project description and/or connected repository summary exist, both MUST be included in generation and refinement prompts; the workbench MUST show which context sources are active before Generate.
- Q: What happens when the user navigates away during refinement? → A: Cancel on leave — in-flight refinement aborts; last valid dataset remains when they return.
- Q: Should chat and tables behave like the Tonic Fabricate demo (streaming)? → A: Yes — assistant chat text streams into the agent dock as it arrives; collection tables populate progressively as each collection completes during generation (inspired by [team demo](https://www.youtube.com/watch?v=qAtGUNLav5k)).
- Q: When does streaming ship relative to the workbench shell and export? → A: Phase 2 priority — Phase 1 delivers shell, tables, and merged refine; Phase 2 delivers streamed chat and progressive tables before JSON export.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Workbench Entry and Resume (Priority: P1)

As an authenticated developer with a saved project, I want to open a single generation workbench so I can continue schema setup, generation, and refinement without walking through unrelated wizard steps.

**Why this priority**: The workbench shell is the foundation; without it, other UX improvements remain bolted onto the wizard.

**Independent Test**: Open generate mode for a project with a saved schema; confirm the workbench loads with schema summary, counts, and generate action visible without stepping through GitHub or schema-choose cards.

**Acceptance Scenarios**:

1. **Given** a project with a saved schema snapshot, **When** the user opens generate mode for that project, **Then** the workbench opens with schema summary, per-collection counts, and a primary generate action.
2. **Given** a project without a saved schema, **When** the user opens the workbench, **Then** a setup panel prompts for schema input (paste, upload, or MongoDB) without hiding the workbench frame.
3. **Given** the user arrived from project overview or projects list, **When** they click Generate or Add schema, **Then** they land in the same workbench with project context loaded.

---

### User Story 2 - Generation Plan Before Run (Priority: P1)

As a developer, I want to see how TestSeed will generate data (collection order, references, counts, warnings) before starting AI generation so I trust referential integrity.

**Why this priority**: Agent-centric synthetic-data products expose planning; TestSeed already computes dependency order but does not show it in the UI.

**Independent Test**: Load a schema with parent and child collections; confirm the plan lists generation order, reference edges, and blocking warnings before the user clicks Generate.

**Acceptance Scenarios**:

1. **Given** a reviewed schema with reference fields, **When** the user views the workbench, **Then** the generation plan shows collection order consistent with parent-before-child rules.
2. **Given** a plan with blocking issues (zero parent count, missing referenced collection, cycle), **When** the user views the plan, **Then** warnings explain each issue and a prominent risk notice appears; Generate remains available so the user may proceed at own risk.
3. **Given** the user changes per-collection counts, **When** counts update, **Then** the plan reflects the new totals and expected record count.

---

### User Story 3 - Table Preview and Validation Feedback (Priority: P1)

As a developer, I want to preview generated records in per-collection tables with validation status so I can inspect realistic data faster than reading raw JSON.

**Why this priority**: Table preview is the largest perceived UX gap versus agent-centric synthetic-data demos.

**Independent Test**: Generate a valid dataset; switch collection tabs; confirm rows match schema fields and validation badges match validation results.

**Acceptance Scenarios**:

1. **Given** a successful generation, **When** results load, **Then** each collection appears in a tab or list with columns derived from the reviewed schema.
2. **Given** a multi-collection schema, **When** generation is in progress, **Then** completed collections appear in the data canvas with rows visible while later collections are still generating (progressive table population).
3. **Given** validation warnings or errors, **When** results are shown, **Then** the UI surfaces collection- and field-level messages without exposing internal provider output.
4. **Given** reference fields (identifiers linking collections), **When** the user inspects a row, **Then** referenced values are visually identifiable without cluttering the preview.
5. **Given** generation is running, **When** the user views the data canvas, **Then** in-progress and completed collection states are distinguishable (e.g., loading vs ready).

---

### User Story 4 - Integrated Chat Refinement (Priority: P2)

As a developer, I want to refine generated data via a chat panel on the same screen so I can iterate without changing wizard steps.

**Why this priority**: Refinement capability already exists; the workbench relocates and improves the UX.

**Independent Test**: Generate data, send a chat instruction in the agent dock, confirm the table preview updates when refinement succeeds and stays unchanged when refinement fails.

**Acceptance Scenarios**:

1. **Given** a valid generated dataset displayed in the workbench, **When** the user submits a refinement message, **Then** the chat dock shows progress, appends the user message immediately, and streams assistant text into the dock as it arrives (not only after the full response completes).
2. **Given** a successful refinement, **When** validation passes, **Then** the table preview replaces data and shows a brief success summary.
3. **Given** a failed refinement, **When** validation fails, **Then** the previous valid dataset remains visible and the user sees an actionable error.
4. **Given** the user asks a non-mutating question, **When** the system returns guidance only, **Then** the dataset is unchanged.

---

### User Story 5 - Context-Informed Generation (Priority: P1)

As a developer, I want generation and refinement to use my project description and connected GitHub repository summary when available so seed data reflects my application domain and codebase context.

**Why this priority**: Domain-realistic data is a core product promise; the workbench must make context visible and ensure it reaches every generation and refinement request.

**Independent Test**: Connect a project with description and GitHub repo; generate records; confirm the workbench shows active context sources before Generate and resulting values reflect the stated domain. Repeat with description only and with neither source to confirm graceful degradation.

**Acceptance Scenarios**:

1. **Given** a project with a description, **When** the user views the workbench before generating, **Then** the setup rail shows that project context will inform generation.
2. **Given** a connected GitHub repository with a stored summary, **When** the user generates records, **Then** project description and repository summary are both included in the generation prompt.
3. **Given** no project description and no connected repository, **When** the user generates records, **Then** generation still runs with a warning that values may be generic.
4. **Given** a valid dataset and a refinement message, **When** refinement runs, **Then** the same available project and repository context is included in the refinement prompt.

---

### User Story 6 - Finish and Project Handoff (Priority: P2)

As a developer, I want a clear finish state from the workbench so I can return to the project with confidence that the batch is saved in history.

**Why this priority**: Completes the loop started in generation; export is deferred to Phase 2 per phased delivery.

**Independent Test**: After generation, use Finish; confirm navigation to project detail and history reflects the generation event.

**Acceptance Scenarios**:

1. **Given** a valid dataset, **When** the user clicks Finish, **Then** the user reaches the project detail page without navigation errors or full page reload failures.
2. **Given** Phase 1 workbench, **When** the user looks for export actions, **Then** export is not offered; Finish is the primary handoff action.
3. **Given** Phase 1 workbench, **When** generation or refinement runs, **Then** results appear after the full operation completes (no streaming until Phase 2).
4. **Given** a valid dataset after Phase 2 export slice ships, **When** export is available and the dataset is invalid, **Then** export actions are disabled with validation explanation.

---

### User Story 7 - Collapsible Setup (Context, GitHub, Schema) (Priority: P3)

As a new user, I still want guided setup for project context, GitHub, and schema input, but as collapsible sections that do not replace the workbench layout.

**Why this priority**: Preserves onboarding value while adopting the workbench for returning users.

**Independent Test**: Create a new project, expand Setup, complete context and schema flows, collapse Setup, and confirm the data canvas gains space.

**Acceptance Scenarios**:

1. **Given** a new project, **When** the user expands Setup, **Then** they can complete project description, optional GitHub connect, and schema input using existing flows.
2. **Given** GitHub authorization returns to generate, **When** the callback loads, **Then** the user remains in the workbench with repository context visible in the setup rail.
3. **Given** setup is complete, **When** the user collapses Setup, **Then** the data canvas and agent dock gain horizontal space.

---

### Edge Cases

- What happens when the user opens the workbench while generation is already in progress? The UI shows in-progress state and prevents duplicate runs until the current operation completes or is cancelled.
- What happens when schema snapshot is stale relative to the latest review? The workbench warns the user and offers to reload or re-save the schema before generation.
- What happens when generation fails entirely? The table area shows an empty state with a clear error; chat refinement remains disabled until a valid dataset exists.
- What happens when the user navigates away mid-refinement? In-flight refinement is cancelled; returning users always see the last valid dataset unchanged.
- What happens when the user navigates away mid-generation? In-flight generation is cancelled; partial rows from completed collections are discarded unless the user explicitly saved or the product adds a future "keep partial" action.
- What happens on small viewports? The three-pane layout stacks (setup, canvas, agent) without losing access to primary actions.
- What happens when record counts exceed safe limits? The system warns and suggests reduced counts; the user may still proceed unless a separate hard limit applies elsewhere in the product.
- What happens when the user generates despite plan warnings? Generation runs; validation errors on the result are surfaced in the table preview and agent dock without silently fixing referential issues.
- What happens when the user has no authenticated session? The workbench is unreachable; the user is directed to sign in.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Generation Workbench for generate, preview, refine, and finish. **Amendment (shipped):** a dedicated **setup wizard** handles new-project onboarding (context, GitHub, schema, review); the workbench is entered after schema save or via `?mode=generate` for returning users.
- **FR-002**: Workbench MUST show schema snapshot summary (version, collection count, field count) when available.
- **FR-003**: Workbench MUST allow per-collection record count editing and display total requested records before generation.
- **FR-004**: Workbench MUST display a generation plan showing collection order, reference relationships, and warnings before generation starts.
- **FR-004a**: When the plan has blocking issues, workbench MUST show a prominent risk warning but MUST NOT disable Generate; the user may proceed at own risk.
- **FR-005**: Workbench MUST use existing authenticated generation and refinement services; presentation layer MUST NOT duplicate business rules.
- **FR-006**: Workbench MUST render generated records in per-collection table views, not JSON alone.
- **FR-007**: Workbench MUST keep chat refinement in the same view as preview after the first valid dataset exists.
- **FR-008**: Workbench MUST preserve all validation and security rules (no prompts, secrets, or internal error details shown to users).
- **FR-009**: Workbench MUST use in-app navigation for finish and internal links so users do not experience broken transitions between workbench and project pages.
- **FR-010**: Workbench SHOULD provide quick-refinement prompt suggestions for common requests (domain realism, email patterns, numeric variance).
- **FR-011**: Workbench MUST expose Finish as the Phase 1 handoff action; JSON export and copy actions MUST NOT ship until Phase 2 export slice (after streaming).
- **FR-011a**: Workbench MUST show which context sources (project description, connected repository summary) are active before Generate.
- **FR-011b**: Workbench MUST pass project description and repository summary (when each is available) into every generation and refinement request so they are included in the AI prompt.
- **FR-012**: **Amendment (shipped):** New projects use a stepper **setup wizard** on `/generate`. The workbench setup rail is for edit/resume links and context summary—not a replacement for the wizard onboarding flow.
- **FR-013**: Agent dock MUST stream assistant refinement text into the chat transcript as content arrives, matching the responsive feel of agent-centric synthetic-data demos (Phase 2).
- **FR-014**: Data canvas MUST populate collection tables progressively during generation so users see rows for completed collections before the full dataset finishes (Phase 2).
- **FR-015**: Workbench MUST show per-collection generation progress (pending, in progress, complete) while streaming generation runs (Phase 2).
- **FR-016**: Navigating away during in-flight refinement MUST cancel the request; the last valid dataset MUST remain visible when the user returns.

### Key Entities

- **Generation Workbench Session**: UI state for active project, schema snapshot, counts, plan, dataset, chat history, and validation results.
- **Generation Plan View**: Read-only presentation of collection order, reference edges, counts, and dependency warnings.
- **Collection Table View**: Tabular projection of generated records for one collection.
- **Agent Dock**: Chat transcript, input, refinement status, and quick prompts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users with a saved schema reach the generate action in one navigation from project overview (no more than one optional setup expand).
- **SC-002**: 100% of generation plans shown in the workbench match parent-before-child dependency order for acceptance-tested schemas.
- **SC-003**: Users can complete generate → refine → finish without using a separate wizard step for refinement.
- **SC-004**: Table preview appears within 1 second of generation completing for demo-sized datasets (500 or fewer total records).
- **SC-005**: Zero failed internal navigations from workbench finish actions to project pages during acceptance testing.
- **SC-006** (Phase 2): Users see the first assistant chat content within 2 seconds of submitting a refinement message under normal network conditions.
- **SC-007** (Phase 2): For multi-collection schemas, users see rows for the first completed collection before the final collection finishes generating.

## Assumptions

- AI seed generation and refinement remain the source of truth for data mutations.
- Project description and GitHub repository summary are already supported by the generation service; the workbench must surface and preserve them, not reimplement prompt logic.
- Phase 1 delivers the workbench shell, static table preview after full generation, and merged refine without streaming.
- Phase 2 delivers streamed chat, progressive table population, generation progress UI, then JSON export on the finish surface.
- JS seed script export and direct MongoDB insert remain separate product epics beyond Phase 2.
- Mobile view may collapse the three-pane layout into stacked sections; desktop is the primary design target.
- Users are authenticated before accessing the workbench.
- **Shipped flow:** setup wizard for create → workbench for generation; **dataset versions** persist immutable snapshots with labels, lineage, dataset, counts, and refinement chat (`generated_dataset_records`). See `docs/dataset-version-history.md`.
- Editable preview cells remain **out of scope** — see epic **007-preview-editing** (planned).

## Out of Scope (this epic)

- SQL or non-MongoDB export formats.
- Multi-database projects per workspace model.
- Mock API generation.
- Replacing core validation or AI prompt design.
- Editable preview cells (owned by Preview and Editing epic in product requirements).

## Related Documentation

- `specs/006-generation-workbench/plan.md` — phased implementation
- `specs/006-generation-workbench/research.md` — agent-centric UX comparison
- `docs/ui-design.md` — current wizard vs planned workbench layout
- `docs/generation-ux-roadmap.md` — executive summary and epic map
