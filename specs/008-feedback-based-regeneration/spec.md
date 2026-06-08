# Feature Specification: Feedback-Based Regeneration

**Feature Branch**: `008-feedback-based-regeneration`

**Created**: 2026-06-08

**Status**: Draft

**Input**: User description: "Feature: Feedback-Based Regeneration. As a developer, I want to add comments so the next generation improves based on my feedback. Scope: add feedback-based regeneration to the existing generation workbench and preview flow while reusing existing project, schema, counts, generated records, and AI generation infrastructure."

**Depends on**: AI Seed Generation (005), Generation Workbench (006), and Preview and Editing (007).

## Problem

Generated datasets are often close to useful but still need targeted adjustments. Today, users can identify issues in preview, but refining records through guided comments is inconsistent and does not always communicate what changed, what failed, or why a request was partially applied.

Without a clear feedback-based regeneration flow, users either perform repetitive manual edits or restart generation with less control, slowing iteration and reducing trust in results.

## Goal

Enable developers to iteratively improve generated datasets by submitting natural-language feedback that drives a new regeneration pass while preserving schema validity and reference integrity.

The feature must:

1. Accept user feedback from the existing workbench/preview experience.
2. Regenerate using prior generated output plus the new feedback.
3. Keep schema constraints authoritative (types, required, enum, uniqueness, references).
4. Explain partial application or rejected requests clearly.
5. Preserve existing preview editing behavior and downstream export/insert rules.

**Non-goal for this epic**: Introducing new export formats, direct seeding behavior changes, rollback behavior changes, or a separate standalone regeneration app.

## Clarifications

### Session 2026-06-08

- Q: What should happen if the user submits feedback again while a regeneration request is still in progress? → A: Allow only one in-flight regeneration; disable submit until it finishes.
- Q: If users have unsaved manual cell edits and submit feedback regeneration, what should happen to those unsaved edits? → A: Keep unsaved edits in the current preview; regeneration uses last accepted dataset only.
- Q: When the user leaves the page while regeneration is still running, what should happen? → A: Cancel the in-flight regeneration and keep the last accepted dataset.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Regenerate from Feedback in Preview (Priority: P1)

As a developer, I want to submit comments from the generation workbench so the next dataset version reflects my feedback without restarting from scratch.

**Why this priority**: This is the core capability of the epic and the shortest path from user intent to better data.

**Independent Test**: Generate a dataset, submit feedback such as "use Canadian addresses", and confirm a new dataset version appears in the same workbench flow.

**Acceptance Scenarios**:

1. **Given** a generated dataset is visible in the workbench, **When** the user submits feedback text, **Then** the system starts a regeneration request using the current dataset context.
2. **Given** regeneration completes successfully, **When** the user views results, **Then** updated records are shown in the existing preview tables.
3. **Given** the user provides no feedback text, **When** they attempt to submit, **Then** the system blocks submission with a clear prompt to enter actionable feedback.

---

### User Story 2 - Enforce Schema-Valid Outcomes (Priority: P1)

As a developer, I want feedback-driven regeneration to remain schema-valid so refined data is still safe for preview handoff, export, and insertion flows.

**Why this priority**: Regeneration that breaks schema rules removes trust and creates downstream failures.

**Independent Test**: Submit feedback that conflicts with enum or required constraints and verify the resulting dataset remains schema-valid or the previous valid dataset is retained.

**Acceptance Scenarios**:

1. **Given** feedback conflicts with schema constraints, **When** regeneration runs, **Then** schema constraints take precedence over conflicting feedback.
2. **Given** regeneration returns schema-invalid output, **When** validation completes, **Then** invalid output is not accepted as the active dataset.
3. **Given** a refinement request can be satisfied while preserving references, **When** regeneration completes, **Then** reference integrity remains valid across related collections.

---

### User Story 3 - Explain Partial or Rejected Changes (Priority: P2)

As a developer, I want understandable explanations when feedback cannot be fully applied so I can adjust my request quickly.

**Why this priority**: Clear explanations reduce trial-and-error and help users converge on valid outcomes faster.

**Independent Test**: Submit a request that is partly feasible and confirm the response identifies what was applied and what was not.

**Acceptance Scenarios**:

1. **Given** a request is only partly compatible with schema rules, **When** regeneration returns, **Then** the user sees a plain-language summary of applied and skipped parts.
2. **Given** a request cannot be applied safely, **When** regeneration is rejected, **Then** the user receives a clear reason and guidance to revise feedback.
3. **Given** multiple constraints affect the request, **When** the result is shown, **Then** explanations remain concise and avoid internal implementation jargon.

---

### User Story 4 - Preserve Existing Workbench and Editing Flow (Priority: P2)

As a developer, I want regeneration feedback to fit the existing workbench and not break preview editing so iteration stays continuous.

**Why this priority**: The feature must extend, not disrupt, the current user flow already defined by prior epics.

**Independent Test**: Use regeneration and then continue preview/editing without leaving the flow or losing expected validation behavior.

**Acceptance Scenarios**:

1. **Given** the user triggers feedback-based regeneration from the workbench, **When** results return, **Then** the user remains in the same generation/preview experience.
2. **Given** new results are accepted, **When** the user edits records afterward, **Then** preview editing behavior and validation rules remain unchanged.
3. **Given** export or direct insert is later attempted, **When** the regenerated dataset is invalid, **Then** downstream blocking rules continue to apply as defined in existing specs.

---

### Edge Cases

- Feedback requests mutually incompatible outcomes in one prompt.
- Feedback asks for values outside allowed enums or required fields.
- Feedback implies record count or structural changes outside the requested scope.
- Regeneration output is malformed or missing one or more collections.
- Regeneration output is valid for most collections but breaks references in one collection.
- User submits repeated feedback quickly before prior regeneration has finished; the system keeps one in-flight regeneration and disables submit until completion.
- User navigates away during in-progress regeneration; the in-flight regeneration is canceled and the last accepted dataset remains active.
- User applies feedback after manual edits that have not been persisted; unsaved edits stay only in the current preview while regeneration input is the last accepted dataset.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a feedback input action in the generation workbench/preview flow after a dataset is generated.
- **FR-002**: System MUST require non-empty feedback text before submitting a regeneration request.
- **FR-003**: System MUST submit regeneration requests using the previous accepted generated dataset and the latest user feedback together.
- **FR-004**: System MUST preserve existing project context, schema context, and requested record counts when processing feedback-based regeneration.
- **FR-005**: System MUST validate regenerated output against the same schema rules used for generation and editing (types, required, enum, uniqueness, references).
- **FR-006**: System MUST reject regenerated output that fails blocking validation and MUST NOT replace the current accepted dataset with invalid output.
- **FR-007**: System MUST keep schema constraints authoritative when feedback conflicts with them.
- **FR-008**: System MUST provide a user-facing summary describing whether feedback was fully applied, partially applied, or rejected.
- **FR-009**: System MUST explain which parts of a partially applied request were skipped and why, in plain language.
- **FR-010**: System MUST preserve referential integrity across collections in accepted regenerated datasets.
- **FR-011**: System MUST keep the user in the existing workbench/preview flow after regeneration attempts.
- **FR-012**: System MUST preserve compatibility with existing preview editing behavior defined in the Preview and Editing epic.
- **FR-013**: System MUST preserve downstream dataset validity gates so invalid regenerated datasets cannot proceed to export or direct insertion.
- **FR-014**: System MUST provide clear status feedback for regeneration lifecycle states (idle, submitted, in_progress, accepted, partial, rejected, cancelled, failed).
- **FR-015**: System MUST allow only one in-flight regeneration request at a time and MUST disable feedback submission controls until that request completes or fails.
- **FR-016**: System MUST preserve unsaved manual preview edits in the current view when regeneration is submitted, and MUST use the last accepted dataset (not unsaved edits) as regeneration input.
- **FR-017**: System MUST cancel in-flight regeneration when the user leaves the page or workbench context, and MUST preserve the last accepted dataset as the active state on return.

### Key Entities

- **Feedback Prompt**: A user-authored natural-language instruction intended to improve a generated dataset.
- **Regeneration Request**: A refinement attempt combining prior generated records, project/schema context, and the latest feedback prompt.
- **Regeneration Result**: Candidate regenerated records and summary metadata indicating applied/partial/rejected outcome.
- **Constraint Conflict**: A detected mismatch between requested feedback changes and schema-valid rules.
- **Application Summary**: User-visible explanation of what changed, what did not change, and why.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of valid feedback submissions produce a regeneration result in the existing workbench flow without requiring a restart.
- **SC-002**: 100% of accepted regenerated datasets pass blocking schema validation before becoming active.
- **SC-003**: 100% of rejected or partially applied feedback submissions provide a user-facing explanation of the outcome.
- **SC-004**: At least 85% of users can successfully refine a dataset with one feedback attempt in under 60 seconds during usability testing.
- **SC-005**: 0% of known-invalid regenerated datasets proceed to export or direct insertion in acceptance testing.

## Assumptions

- Existing generation workbench and preview table infrastructure remain the primary interaction surface.
- Existing schema validation rules and dependency-aware generation logic remain available and are reused.
- Existing preview editing capabilities from 007 remain in place and must not regress.
- This epic focuses on feedback-driven regeneration behavior and user communication, not on new export or seeding features.
- Users are authenticated and operating within an existing project that already has reviewed schema context.

## Out of Scope

- New export formats or export UX redesign.
- Changes to direct MongoDB seeding workflow or rollback mechanics.
- Bulk spreadsheet import, external prompt templates, or autonomous multi-turn planning outside a single feedback submission.
- Replacing inline preview editing with a different editing paradigm.

## Invariants

- Canonical regeneration outcomes are exactly: `accepted`, `partial`, `rejected`, `cancelled`.
- Canonical workbench lifecycle states are exactly: `idle`, `submitted`, `in_progress`, `accepted`, `partial`, `rejected`, `cancelled`, `failed`.
- Only one regeneration request can be in flight per workbench session.
- Unsaved preview edits remain local to the current preview and are excluded from regeneration input.
- Export, direct seeding, and rollback behavior remain unchanged by this feature.
