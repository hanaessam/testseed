# Feature Specification: Preview and Editing

**Feature Branch**: `007-preview-editing`

**Created**: 2026-06-08

**Status**: Shipped

**Input**: User description: "Preview and Editing epic for TestSeed generation workbench. Users must edit generated record cells in the workbench table before export or direct insert. Edits revalidate against the saved schema (types, enums, required, unique, references). Invalid edits show inline errors; export stays blocked until the dataset is valid again. Edited datasets update in client state; persist by **forking** a new dataset version (never overwrite in place). Read-only reference/ObjectId fields may be display-only or restricted. Align with docs/requirements.md Preview and Editing user stories."

**See also**: `docs/dataset-version-history.md`

**Depends on**: Generation Workbench (006) — per-collection table preview, saved generated datasets, schema snapshot review, and dataset validation status already shipped. Export and direct MongoDB insert are downstream consumers that MUST honor edit-time validation gates defined here.

## Problem

Developers can **preview** generated seed data in the workbench but cannot **correct individual field values** without asking the AI to regenerate or editing JSON elsewhere. Small fixes — a typo, a wrong enum, a missing required field — force a full refinement cycle or manual export editing outside TestSeed.

Without inline editing and immediate revalidation, users cannot confidently hand off datasets to export or database insertion. Invalid manual changes could slip through if validation is only shown at generation time.

## Goal

Complete the **Preview and Editing** epic from product requirements by letting developers:

1. **Edit** generated record values directly in workbench tables before export or insertion.
2. **Revalidate** every edit against the saved schema (field types, enum values, required fields, uniqueness, and cross-collection references).
3. **See inline errors** on invalid cells and **block export and insertion** until the full dataset is valid again.
4. **Keep edits in workbench state** immediately, with **persistence** by forking a new **dataset version** (PATCH) or creating one (POST).
5. **Protect referential integrity** by treating identifier and reference fields as read-only or restricted where editing would break ObjectId links.
6. **Feel like working on a canvas** — direct, in-place editing on the data canvas with a simple, intuitive interface that stays out of the user's way.

**Non-goal for this epic**: New AI generation or refinement behavior, export script generation, direct MongoDB insert UI, or rollback — those epics consume the validated dataset this feature produces.

## Clarifications

### Session 2026-06-08

- Q: How should the first save work for a freshly generated dataset with no saved version loaded? → A: First explicit Save creates a new dataset version; subsequent saves fork new versions from the active one.
- Q: Can users edit cells on records that already failed validation at generation time? → A: Yes — users may edit any editable cell, including on rows and collections that were invalid after generation, to fix issues without AI refinement.
- Q: When should a cell edit trigger revalidation? → A: On commit only — when the user leaves the cell (blur) or presses Enter; not on every keystroke.
- Q: When should the leave-page warning appear? → A: On any unsaved edits, whether the dataset is currently valid or invalid.
- Q: How should users cancel an in-progress cell edit before commit? → A: Escape cancels the in-cell edit and restores the pre-edit value without commit or revalidation.
- Q: What editing experience should the workbench aim for? → A: Canvas-like — users edit directly on the data canvas with a simple, intuitive UI; minimal steps, no modal-heavy flows for ordinary cell fixes.
- Q: How should edited cells be indicated after commit? → A: Each committed edited cell shows a subtle accent left border plus a small “Edited” dot or label on that cell until the dataset is saved or reloaded.
- Q: How should enum fields be edited? → A: Enum fields open a dropdown (select list) of reviewed enum values on edit; users pick from the list rather than typing free text.

## Experience principles

Editing MUST feel like working **on the data canvas**, not inside a separate form or wizard step.

- **Direct manipulation**: Click a cell, change the value in place, move on. No extra screens for routine scalar edits.
- **Simple surface**: One primary interaction pattern (select → edit → commit). Avoid duplicate controls, nested menus, or dense toolbars for basic fixes.
- **Clear affordances**: Editable cells are visually distinct from read-only fields; committed edits show a visible edited indicator; enum fields use a pick list instead of free typing; unsaved and invalid states use short, plain labels — not technical jargon.
- **Lightweight feedback**: Validation appears inline at the cell; dataset status stays visible in the workbench chrome without covering the table.
- **Stay in flow**: Collection tabs, scroll, and panel collapse behave predictably; edits never trap the user or force a full-page reload.
- **Forgiving**: Escape cancels a mistaken in-cell edit; navigate-away warnings protect work without punishing exploration.

These principles apply to the center **data canvas** of the generation workbench (tables remain the primary editing surface for v1).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Canvas-Like Inline Editing (Priority: P1)

As a developer, I want to edit generated record values directly on the data canvas so fixing seed data feels as natural as working on a spreadsheet — simple, intuitive, and immediate.

**Why this priority**: Direct, canvas-like editing is the core capability missing from preview-only tables; without it, the epic delivers no new user value.

**Independent Test**: Generate or load a valid dataset; click a non-read-only cell on the data canvas; change the value in place; confirm the update appears without modals, extra steps, or leaving the workbench.

**Acceptance Scenarios**:

1. **Given** a valid generated dataset on the data canvas, **When** the user clicks an editable cell and changes the value in place, **Then** the workbench updates that cell without modals, wizard steps, or navigation away from the canvas.
2. **Given** the data canvas is visible, **When** the user scans editable vs read-only cells, **Then** editable cells are visually distinguishable without reading documentation.
3. **Given** the user commits an edit, **When** the value changes, **Then** that cell shows an edited indicator (accent left border and a small “Edited” marker) until save or reload clears the session baseline.
4. **Given** a field with reviewed enum values, **When** the user clicks to edit, **Then** a dropdown or select list shows all allowed enum options and the user picks one (no free-text entry for enum fields).
5. **Given** a dataset with validation errors from generation, **When** the user edits an editable cell on an invalid row, **Then** the cell updates, revalidation runs, and inline errors clear when the fix satisfies schema rules.
6. **Given** multiple collections in the dataset, **When** the user switches collection tabs, **Then** prior edits in other collections remain visible and unchanged.
7. **Given** a loaded dataset version, **When** the user edits a cell, **Then** the workbench marks the dataset as having unsaved changes until the user persists or discards them.
8. **Given** the user is editing a cell, **When** they press Escape before commit, **Then** the cell restores its pre-edit value and no revalidation runs.

---

### User Story 2 - Schema Revalidation on Edit (Priority: P1)

As a developer, I want every edit checked against my reviewed schema so I know the dataset still matches types, enums, required rules, uniqueness, and references before I export or insert.

**Why this priority**: Editing without validation would undermine trust in export and insertion; revalidation is inseparable from editing.

**Independent Test**: Edit a string field to an invalid enum value; confirm an inline error appears. Fix the value; confirm the error clears and dataset validity returns.

**Acceptance Scenarios**:

1. **Given** a field with a defined enum, **When** the user edits the cell, **Then** only reviewed enum values appear in the dropdown/select list and the committed value must be one of those options.
2. **Given** a required field, **When** the user clears the value, **Then** the cell shows an inline required-field error.
3. **Given** a field marked unique in the schema, **When** the user duplicates a value already used in another row of the same collection, **Then** both conflicting cells show a uniqueness error.
4. **Given** a reference field linking to another collection, **When** the user changes an editable scalar field on the same row, **Then** reference integrity is re-checked and errors appear if the row no longer satisfies reference rules.
5. **Given** a type mismatch (e.g., text in a number field), **When** the user commits the edit, **Then** the cell shows a type error with a plain-language explanation.

---

### User Story 3 - Block Export and Insertion When Invalid (Priority: P1)

As a developer, I want export and database insertion disabled while my dataset has validation errors so I never ship broken seed data.

**Why this priority**: The product promise in requirements is explicit: invalid data must not leave TestSeed through export or insert paths.

**Independent Test**: Introduce a validation error via edit; attempt export; confirm the action is blocked with a summary of issues. Resolve the error; confirm export becomes available.

**Acceptance Scenarios**:

1. **Given** one or more validation errors anywhere in the dataset, **When** the user views export or insert actions, **Then** those actions are disabled and a summary indicates how many issues remain.
2. **Given** validation errors on multiple collections, **When** the user opens the validation summary, **Then** they can navigate to the affected collection and field.
3. **Given** all validation errors are resolved, **When** the dataset was previously invalid, **Then** export and insert actions become enabled without requiring a full regeneration.
4. **Given** a dataset that was valid at generation time, **When** the user makes no edits, **Then** export and insert behavior matches the pre-edit baseline (not blocked).

---

### User Story 4 - Read-Only Identifier and Reference Fields (Priority: P2)

As a developer, I want identifier and reference fields protected from casual edits so I do not accidentally break ObjectId links between collections.

**Why this priority**: Reference integrity is fragile; restricting the riskiest fields prevents most broken datasets while still allowing meaningful scalar edits.

**Independent Test**: Open a table with `_id` and reference columns; confirm those cells are not editable; confirm other columns on the same row remain editable.

**Acceptance Scenarios**:

1. **Given** a row with a document identifier field, **When** the user attempts to edit it, **Then** the cell is read-only or clearly marked non-editable.
2. **Given** a reference field storing an ObjectId to another collection, **When** the user views the table, **Then** the reference is displayed in a human-readable way and is not editable by default.
3. **Given** a read-only field, **When** the user hovers or focuses it, **Then** a short explanation indicates why it cannot be edited (e.g., preserves links between collections).

---

### User Story 5 - Persist Edited Datasets (Priority: P2)

As a developer, I want to save my manual edits as new dataset versions so I can resume later without losing corrections or earlier snapshots.

**Why this priority**: Edits that exist only in transient browser state are lost on navigation; immutable versioning completes the preview-and-edit loop.

**Independent Test**: Load a version, edit a cell, choose "Save changes"; confirm a new version appears with the edited value and the parent version is unchanged.

**Acceptance Scenarios**:

1. **Given** a freshly generated dataset with no version loaded, **When** the user chooses Save after valid edits, **Then** the system creates a new dataset version and that version becomes active.
2. **Given** a loaded version with unsaved edits, **When** the user chooses to save changes, **Then** the system forks a new version reflecting all valid edits and the unsaved indicator clears.
3. **Given** a dataset with unsaved edits, **When** the user chooses to save as a new version, **Then** a new entry appears in the dataset versions list with `parentDatasetId` lineage.
4. **Given** validation errors remain, **When** the user attempts to persist, **Then** persistence is blocked with the same validation summary used for export.
5. **Given** the user navigates away with any unsaved edits (valid or invalid dataset), **When** they have not persisted, **Then** the system warns that changes may be lost (or offers to save) before leaving.

---

### User Story 6 - Validation Feedback in Preview (Priority: P3)

As a developer, I want collection- and dataset-level validation status updated as I edit so I always know whether the batch is ready for handoff.

**Why this priority**: Aggregated status complements per-cell errors and matches the validation badges already shown after generation.

**Independent Test**: Edit a cell to introduce an error; confirm collection tab or summary shows invalid state; fix the cell; confirm status returns to valid.

**Acceptance Scenarios**:

1. **Given** a valid dataset, **When** the user introduces an invalid edit, **Then** the affected collection shows an invalid or warning state in the workbench chrome.
2. **Given** errors in multiple collections, **When** the user views the workbench header or summary, **Then** total error count is visible without opening each tab.
3. **Given** the user undoes an invalid edit (restores a valid value), **When** no other errors remain, **Then** dataset-level status returns to valid.

---

### Edge Cases

- What happens when the user edits while AI refinement is in progress? Editing is disabled or queued until refinement completes; the last valid dataset remains visible if refinement fails.
- What happens when the user edits a row in a collection that has zero records? The empty state remains; editing does not apply.
- What happens when the schema snapshot changes after edits were made? The workbench warns that validation rules may have changed and offers to revalidate against the current saved schema.
- What happens when the user pastes invalid content into a cell? The paste is validated on commit (blur or Enter), same as typed input; partial paste that cannot be coerced shows a type error after commit.
- What happens while the user is still typing in a cell? No revalidation or inline errors until commit; prior validation state for that cell remains until commit.
- What happens when the user presses Escape while editing a cell? The in-cell edit is cancelled, the pre-edit value is restored, and no revalidation runs.
- What happens when uniqueness spans more rows than are visible? Uniqueness is evaluated across the full in-memory collection, not only visible rows.
- What happens when a reference points to a deleted parent row? Reference validation flags the orphan link; export and insert remain blocked until fixed via regeneration or allowed future reference-editing scope.
- What happens on small viewports? The canvas remains usable: inline errors stay readable, editable cells stay reachable, and the same simple click-edit-commit pattern applies without a different mobile-only workflow.
- What happens when the user loads JSON-only legacy results without table preview? Once tables are available, the same edit and validation rules apply; raw JSON editing is out of scope.
- What happens when generation produced validation errors? Editable cells remain editable so the user can fix issues manually; export and insert stay blocked until the full dataset is valid.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to edit generated record field values inline in workbench per-collection tables before export or direct insertion, including on rows and collections that were invalid after generation.
- **FR-002**: System MUST revalidate the full dataset against the project's saved reviewed schema after each committed cell edit (blur or Enter), not on every keystroke, checking field types, enum constraints, required fields, uniqueness rules, and cross-collection references.
- **FR-003**: System MUST display inline, field-level validation errors on cells that fail revalidation, using plain language understandable without internal schema jargon.
- **FR-004**: System MUST disable export and direct insertion actions while any validation error exists in the active dataset and MUST show a navigable summary of remaining issues.
- **FR-005**: System MUST update the active workbench dataset in memory when a cell edit is committed (blur or Enter), without requiring regeneration or a full page reload; in-cell typing before commit does not trigger revalidation.
- **FR-006**: System MUST treat document identifier fields and reference fields as read-only by default so users cannot accidentally break ObjectId links; the UI MUST indicate why those fields are restricted.
- **FR-007**: System MUST allow users to persist a valid edited dataset by **forking** a new dataset version (PATCH with parent id) or creating one (POST); persistence MUST be blocked when validation errors remain.
- **FR-008**: System MUST indicate when the dataset has unsaved edits relative to the last loaded or saved version.
- **FR-009**: System MUST preserve edits across collection tab switches and workbench panel collapse/expand within the same session.
- **FR-010**: System MUST apply the same validation rules used for AI-generated batches to manually edited batches so generation, refinement, editing, export, and insertion share one definition of "valid dataset."
- **FR-011**: System MUST warn users before navigating away when any unsaved edits exist, regardless of whether the dataset is currently valid or invalid.
- **FR-012**: System MUST disable or defer cell editing while AI generation or refinement is in progress to avoid conflicting concurrent mutations.
- **FR-013**: System MUST let users cancel an in-progress cell edit with Escape, restoring the pre-edit value without commit or revalidation.
- **FR-014**: System MUST support in-place cell editing on the data canvas without modal dialogs or separate edit screens for routine scalar field changes.
- **FR-015**: System MUST visually distinguish editable cells from read-only identifier and reference fields so users can predict where they can edit before clicking.
- **FR-016**: System MUST show an edited-state indicator on each cell after commit — accent left border plus a small “Edited” dot or label on that cell — so users can scan what changed on the canvas without opening a change log; indicators persist until save, reload, or baseline reset.
- **FR-017**: System MUST keep validation errors inline at the affected cell and MUST NOT block the entire canvas with a full-screen error state for field-level issues.
- **FR-018**: System MUST render fields with reviewed enum values as a dropdown or select list in edit mode, listing only allowed enum options; free-text entry MUST NOT be the primary control for enum fields.

### Key Entities

- **Edited cell**: A single field value change within one record row, tied to a collection name, record index, field path, previous value, and new value.
- **Validation issue**: A schema rule violation produced by revalidation, with collection, field, record location, rule type (type, enum, required, unique, reference), and user-facing message.
- **Dataset validity state**: Aggregate status (valid / invalid) for the in-memory dataset, derived from zero vs. one-or-more validation issues.
- **Dataset version (persisted)**: An immutable snapshot of generated records, counts, optional `versionLabel`, `parentDatasetId` lineage, and chat history; created on generate, refine, save, or accept-candidate — never updated in place for data changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can correct a single invalid field value and restore dataset validity in under 30 seconds without using AI refinement.
- **SC-002**: 100% of export and insert attempts are blocked when the active dataset contains at least one validation error; 0% proceed with a known-invalid batch.
- **SC-003**: At least 90% of test participants can identify which cell caused a blocked export using inline errors and the validation summary alone, without support documentation.
- **SC-004**: Users who save edits and load the new forked version see identical field values in 100% of acceptance test cases; prior versions remain unchanged.
- **SC-005**: Validation feedback appears on the same commit interaction (blur or Enter) for type, enum, and required violations in user acceptance testing.
- **SC-006**: At least 90% of first-time test participants complete a single cell edit (select, change, commit) in under 15 seconds without instructions, demonstrating an intuitive canvas-like flow.
- **SC-007**: In usability testing, at least 85% of participants rate the editing experience as "simple" or "very simple" on a 5-point scale.

## Assumptions

- Generation Workbench table preview and saved dataset load/save flows from the prior epic remain available; this epic extends them rather than replacing them.
- Validation rules are defined by the project's saved schema snapshot at edit time; users who change schema must re-save review before edits are judged against new rules.
- Document identifier (`_id`) and ObjectId reference columns are read-only in the first release; editing reference targets to point at different parents is out of scope unless a future epic explicitly adds it.
- Cell editing targets scalar and simply formatted values shown in table columns; nested object or array editing inside cells is out of scope for v1.
- Persistence requires an explicit user action (save to active run or save as new run); auto-save on every keystroke is not required.
- After fresh generation with no loaded version, the first Save creates a new dataset version.
- Direct MongoDB insertion UI may ship in a later epic; this epic still defines the validation gate that insertion must respect when it becomes available.
- JSON export already exists in the workbench; this epic wires export blocking to edit-time validation state rather than introducing new export formats.
- Users are authenticated developers with access to the project; editing permissions match existing project access rules.
- The data canvas from the generation workbench (center panel with collection tables) is the primary editing surface; a separate spreadsheet-style app or floating editor window is out of scope.
- "Canvas-like" means direct in-canvas manipulation and visual simplicity, not free-form drawing or drag-and-drop layout of records.

## Out of Scope

- AI chat refinement behavior changes (owned by AI seed generation epic).
- JavaScript seed script export format (owned by Export epic).
- Direct MongoDB insert workflow UI (owned by Direct seeding epic).
- Rollback of inserted batches (owned by Rollback epic).
- Bulk spreadsheet import or multi-row paste operations.
- Editing nested documents or array elements through an nested editor UI.
