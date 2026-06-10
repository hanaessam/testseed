# Feature Specification: Direct Seeding Integration

**Feature Branch**: `017-direct-seeding-integration`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "I audited the repository against Epic #15 (Direct MongoDB Seeding) and Epic #13 (Rollback). Direct MongoDB seeding core logic exists, but there is no exposed API endpoint for direct seeding. Export currently generates a JavaScript seed script only. No UI action exists for direct MongoDB Seed, Insert Into MongoDB, Seed Dataset, or Execute Seed Batch. Rollback appears partially implemented with an API route and project history references seedBatchId, but no web UI allows selecting a seed batch and executing rollback. Remaining work: expose direct seeding API endpoint, add confirmation screen with database, collections, counts, and warning; execute insert and store seedBatchId; expose rollback UI using the existing rollback route; surface insertion results and rollback results in project history."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seed Generated Data Directly (Priority: P1)

As an authenticated developer reviewing a generated dataset, I can choose to insert the dataset directly into my MongoDB database after a successful connection test and explicit confirmation.

**Why this priority**: Direct insertion is a core product promise. Without this journey, users can only export scripts and must perform manual work outside TestSeed.

**Independent Test**: Can be tested by generating a dataset, providing a working transient connection, confirming the insertion summary, and verifying an insertion report with a seedBatchId and per-collection counts.

**Acceptance Scenarios**:

1. **Given** a valid generated dataset and a successful connection test, **When** the developer opens direct seeding, **Then** the system shows the target database, collections, record counts, and an explicit insertion warning.
2. **Given** the confirmation summary is displayed, **When** the developer cancels, **Then** no records are inserted and the dataset remains available for preview or export.
3. **Given** the developer confirms direct seeding, **When** insertion succeeds, **Then** the system shows inserted counts by collection and the seedBatchId for the operation.
4. **Given** the connection has not been successfully tested for the active operation, **When** the developer attempts direct seeding, **Then** insertion is blocked until connection testing succeeds.

---

### User Story 2 - Preserve Seed Batch History (Priority: P1)

As a developer who inserted generated records, I can see the seed batch in project history so I can later identify what was inserted and roll it back if needed.

**Why this priority**: Direct seeding is risky without traceability. Users need the seedBatchId, collection counts, status, and timing visible after insertion.

**Independent Test**: Can be tested by completing direct seeding and confirming the project history displays the seed batch with its insertion result and rollback eligibility.

**Acceptance Scenarios**:

1. **Given** direct seeding succeeds, **When** the developer views project history, **Then** the history includes the seedBatchId, insertion status, target database name, inserted counts by collection, and insertion time.
2. **Given** direct seeding partially fails after inserting some records, **When** the developer views project history, **Then** the history distinguishes inserted collections from failed collections and keeps rollback available for inserted records.
3. **Given** sensitive connection information was used for insertion, **When** history is saved or displayed, **Then** the connection string is not stored or shown.

---

### User Story 3 - Roll Back a Seed Batch from History (Priority: P2)

As a developer, I can select a seed batch from project history and roll it back after confirming the destructive action.

**Why this priority**: Rollback completes the direct seeding safety loop, but it depends on seed batches being created and visible first.

**Independent Test**: Can be tested by selecting a rollback-eligible seed batch, confirming rollback, and verifying deleted counts by collection plus updated project history status.

**Acceptance Scenarios**:

1. **Given** project history contains a rollback-eligible seed batch, **When** the developer chooses rollback, **Then** the system shows the seedBatchId, affected collections, expected action, and a destructive-action warning.
2. **Given** the developer confirms rollback, **When** rollback succeeds, **Then** the system shows deleted counts by collection and marks the batch as rolled back in history.
3. **Given** a seed batch has already been rolled back, **When** the developer views project history, **Then** rollback is disabled or rejected with a clear already-rolled-back message.
4. **Given** rollback fails for one or more collections, **When** the result is shown, **Then** completed and failed collection results are clearly distinguished.

---

### User Story 4 - Recover from Direct Seeding Errors (Priority: P2)

As a developer, I receive clear, safe feedback when direct seeding cannot proceed or partially fails, so I can fix the issue without exposing secrets.

**Why this priority**: Connection failures, invalid datasets, and partial insertion failures are common in database workflows and must not leave users guessing.

**Independent Test**: Can be tested by using invalid connection details, invalid generated records, and simulated insertion failures while confirming no connection string appears in user-facing messages or saved history.

**Acceptance Scenarios**:

1. **Given** the connection test fails, **When** the result is displayed, **Then** the developer sees a safe error summary and direct seeding remains unavailable.
2. **Given** generated records are invalid for insertion, **When** the developer attempts direct seeding, **Then** the system blocks insertion and shows validation issues that can be acted on.
3. **Given** insertion partially fails, **When** the report is displayed, **Then** successfully inserted collections include rollback metadata and failed collections include safe error summaries.

---

### Edge Cases

- If the user is not authenticated, direct seeding and rollback actions are unavailable.
- If no generated dataset exists for the current project, direct seeding is unavailable.
- If generated records have validation errors, direct seeding is blocked before any insertion.
- If the requested dataset is empty, direct seeding is blocked with a clear message.
- If the connection test succeeds but the user changes the connection details before confirming, direct seeding requires a new successful connection test.
- If insertion is canceled from the confirmation screen, no records are inserted and no seed batch is created.
- If insertion partially succeeds, the report and history preserve the seedBatchId and inserted collection counts for rollback.
- If rollback is requested for a missing, invalid, unknown, or already rolled back seedBatchId, no records are deleted.
- If rollback partially succeeds, the user can distinguish deleted collections from failed collections.
- Connection strings must remain transient and must never appear in project history, reports, errors, logs, saved datasets, or browser-persisted state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an authenticated direct seeding action from the generated dataset workflow.
- **FR-002**: The system MUST require a successful connection test for the active direct seeding operation before insertion can be confirmed.
- **FR-003**: The system MUST keep MongoDB connection strings transient and MUST NOT store, display, log, or persist them.
- **FR-004**: The system MUST show a confirmation screen before insertion that includes target database, affected collections, record counts, total records, and an explicit warning.
- **FR-005**: The system MUST require explicit user confirmation before inserting records.
- **FR-006**: The system MUST cancel direct seeding without inserting records when the user declines confirmation.
- **FR-007**: The system MUST block direct seeding when the generated dataset is missing, empty, invalid, or not associated with the current authenticated project context.
- **FR-008**: The system MUST insert confirmed datasets in dependency-safe collection order.
- **FR-009**: The system MUST assign and display one seedBatchId for each confirmed insertion operation.
- **FR-010**: The system MUST show insertion results with per-collection inserted counts, overall status, seedBatchId, and safe error summaries when applicable.
- **FR-011**: The system MUST save seed batch history for the project, including seedBatchId, target database name, collection counts, status, timestamps, and rollback eligibility.
- **FR-012**: Saved seed batch history MUST NOT include connection strings or secret connection details.
- **FR-013**: The system MUST allow users to start rollback from a rollback-eligible seed batch in project history.
- **FR-014**: The system MUST show a rollback confirmation screen with seedBatchId, affected collections, expected action, and a destructive-action warning.
- **FR-015**: The system MUST show rollback results with deleted counts by collection, overall status, and safe error summaries when applicable.
- **FR-016**: The system MUST mark successfully rolled back seed batches as rolled back in project history.
- **FR-017**: The system MUST prevent or clearly reject duplicate rollback attempts for already rolled back batches.
- **FR-018**: The system MUST surface partial insertion and partial rollback states in project history without implying full success.
- **FR-019**: The system MUST ensure direct seeding and rollback actions only operate on projects and seed batches owned by the authenticated user.
- **FR-020**: The system MUST provide actionable, non-secret error messages for failed connection tests, blocked insertion, insertion failures, and rollback failures.

### Key Entities

- **Generated Dataset**: The records grouped by collection that a user has reviewed and may insert directly.
- **Direct Seeding Confirmation**: A pre-insertion summary showing target database, collection names, record counts, total records, and the required warning.
- **Seed Batch**: A direct insertion operation identified by seedBatchId with collection counts, status, timestamps, rollback eligibility, and project ownership.
- **Insertion Report**: The user-facing result of direct seeding, including seedBatchId, inserted counts, completed collections, failed collections, and safe errors.
- **Rollback Request**: A user-confirmed request to delete records for one seedBatchId from the selected project history entry.
- **Rollback Report**: The user-facing result of rollback, including seedBatchId, deleted counts, completed collections, failed collections, and safe errors.
- **Project History Entry**: A project timeline item that records direct seeding and rollback outcomes without storing connection strings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of direct seeding attempts without a successful active connection test are blocked before insertion.
- **SC-002**: 100% of direct seeding attempts require explicit confirmation after showing database, collection, count, and warning details.
- **SC-003**: 100% of canceled direct seeding confirmations insert zero records.
- **SC-004**: 100% of successful direct seeding operations display a seedBatchId and inserted counts by collection.
- **SC-005**: 100% of successful and partial direct seeding operations create project history entries without storing connection strings.
- **SC-006**: 100% of rollback-eligible seed batches can be selected from project history and require explicit rollback confirmation.
- **SC-007**: 100% of successful rollback operations display deleted counts by collection and update project history status.
- **SC-008**: 100% of duplicate rollback attempts for already rolled back batches are prevented or rejected before deleting records.
- **SC-009**: 0 connection strings appear in displayed reports, saved history, logged error summaries, or browser-persisted state during verification.
- **SC-010**: At least 90% of test users can complete direct seeding from a generated dataset and find the resulting seedBatchId in history without external instructions.

## Assumptions

- The existing generated dataset workflow remains the entry point for direct seeding.
- Existing connection testing and core direct seeding behavior are reused as the source of truth for insertion safety.
- Existing rollback behavior is reused as the source of truth for deleting records by seedBatchId.
- Users provide a connection string only for the active direct seeding or rollback operation.
- Project history already supports generation-related entries and can be extended to include direct seeding and rollback outcomes.
- The target database name may be displayed because it is operational context, while the full connection string and credentials remain secret.
- Direct seeding and rollback are scoped to authenticated users and their own projects.
