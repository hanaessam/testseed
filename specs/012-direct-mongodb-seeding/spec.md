# Feature Specification: Direct MongoDB Seeding

**Feature Branch**: `014-direct-mongodb-seeding`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "User Story 1: As a developer, I want to test a MongoDB connection before inserting data. Acceptance Criteria: The user can test a MongoDB connection string. The system reports success or failure. The connection string is used for the operation only and is not stored. If the connection fails, direct seeding remains disabled until the user provides a working connection string. User Story 2: As a developer, I want to confirm before direct seeding. Acceptance Criteria: Before insertion, the system shows a confirmation screen. The confirmation includes target database name, collections, record counts, and a warning that records will be inserted. The user must explicitly confirm before insertion begins. If the user cancels, no records are inserted. User Story 3: As a developer, I want inserted records tagged with a seedBatchId. Acceptance Criteria: Every inserted record receives the same seedBatchId for the operation. The insertion report includes collection counts and the seedBatchId. If insertion partially fails, the system reports which collections succeeded and which failed. The system preserves enough information to support rollback of inserted records. Scope: Core implementation only. MongoDB native driver. Preserve dependency-order insertion using dataset.generationOrder. Connection strings must never be stored in database records, project history, saved runs, logs, or responses. MongoDB clients must be closed after operations. Insert-only behavior; no rollback implementation in this epic. Rollback support is limited to recording seedBatchId information needed by a future rollback epic."

## Clarifications

### Session 2026-06-09

- Q: Which remaining direct seeding assumptions should be used before planning? -> A: Use MongoDB native driver ping with a 5-10 second timeout, generate confirmation data from dataset and generationOrder, require validation before seeding, require a matching successful connection test token before seeding, assign a UUID v4 seedBatchId per operation while preserving existing fields, process collections sequentially, return structured partial-failure reports, preserve rollback metadata, close all clients, and keep connection strings out of storage, logs, analytics, and responses.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Test Connection Before Seeding (Priority: P1)

As a developer preparing to insert generated records, I can test a MongoDB connection string before direct seeding is available so I know whether the target database can be reached safely.

**Why this priority**: Connection testing is the first safety gate for direct seeding and prevents attempted inserts against invalid or unreachable targets.

**Independent Test**: Can be tested by providing a working connection string and a failing connection string, then confirming the system reports the correct result and only enables direct seeding after success.

**Acceptance Scenarios**:

1. **Given** a developer provides a working MongoDB connection string, **When** they test the connection, **Then** the system reports success without storing the connection string.
2. **Given** a developer provides an invalid or unreachable connection string, **When** they test the connection, **Then** the system reports failure and direct seeding remains disabled.
3. **Given** a connection test has failed, **When** the developer provides a later working connection string and tests again, **Then** direct seeding becomes available only for that working connection and its matching successful connection test token.
4. **Given** a connection string is tested, **When** the test completes, **Then** the database client is closed and the connection string is absent from stored data, logs, analytics, and responses.

---

### User Story 2 - Confirm Before Insertion (Priority: P1)

As a developer, I must explicitly confirm direct seeding after reviewing the target database name, affected collections, record counts, and insertion warning so accidental database writes do not occur.

**Why this priority**: Direct seeding mutates a user's database, so confirmation is required before any records are inserted.

**Independent Test**: Can be tested by preparing a valid seeding operation, reviewing the confirmation summary, cancelling once, and explicitly confirming once.

**Acceptance Scenarios**:

1. **Given** direct seeding is available and generated records are ready, **When** the developer reaches the confirmation step, **Then** the system presents the target database name, collections, record counts per collection, total record count, and a warning that insertion is irreversible without rollback.
2. **Given** the confirmation step is shown, **When** the developer cancels, **Then** no records are inserted.
3. **Given** the confirmation step is shown, **When** the developer explicitly confirms, **Then** insertion begins.

---

### User Story 3 - Report Seed Batch Results (Priority: P1)

As a developer, I want every inserted record tagged with the same seedBatchId and I want an insertion report so I can understand what was inserted and preserve the information needed for future rollback.

**Why this priority**: Batch tagging and reporting are essential for auditability, troubleshooting, and later rollback support.

**Independent Test**: Can be tested by inserting a small multi-collection dataset and verifying all inserted records share one batch identifier while the report lists collection counts and any failures.

**Acceptance Scenarios**:

1. **Given** a confirmed direct seeding operation, **When** records are inserted, **Then** every inserted record receives the same seedBatchId for that operation.
2. **Given** insertion completes successfully, **When** the report is returned, **Then** it includes the seedBatchId and inserted counts by collection.
3. **Given** one or more collections fail during insertion, **When** the report is returned, **Then** it identifies which collections succeeded, which failed, inserted record counts, error summaries, and the seedBatchId information needed for later rollback of successfully inserted records.

---

### Edge Cases

- If a connection string is empty, malformed, unauthorized, points to an unavailable host, or times out, the system reports failure and does not enable direct seeding.
- If a previously successful connection is replaced with a different connection string, direct seeding requires that new connection string to pass testing before insertion.
- If a seeding request lacks a successful connection test token, or the token does not match the active connection string, direct seeding does not begin.
- If connection testing exceeds the configured short timeout, the system reports failure and closes the database client.
- If generated records are empty or a requested collection has zero records, the confirmation and report must represent the counts accurately.
- If the dataset includes multiple collections, insertion order follows the dataset's generation order so dependent records are inserted after their dependencies.
- If the dataset fails validation, direct seeding does not begin.
- If a collection insertion partially succeeds before a later collection fails, the report separates succeeded collections from failed collections and preserves the shared batch identifier for inserted records.
- If insertion is cancelled before explicit confirmation, no target database changes are made.
- If an operation ends in success, failure, cancellation, or an error, the database client connection is closed afterward.
- Connection strings must never appear in stored records, saved history, saved datasets, logs, analytics, reports, or user-facing responses.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a developer to test a MongoDB connection string before direct seeding.
- **FR-002**: The system MUST test connectivity using a database ping and a short timeout between 5 and 10 seconds.
- **FR-003**: The system MUST use a connection string only for the active connection test or direct seeding operation.
- **FR-004**: The system MUST NOT store connection strings in database records, project history, saved runs, saved datasets, logs, analytics, or responses.
- **FR-005**: Direct seeding MUST remain unavailable until the developer provides a connection string that passes connection testing and supplies a matching successful connection test token for the active seeding request.
- **FR-006**: Before insertion begins, the system MUST present a confirmation summary generated from the dataset and generationOrder that includes the target database name, target collections, per-collection record counts, total record count, and a warning that insertion is irreversible without rollback.
- **FR-007**: The system MUST require explicit confirmation before insertion begins.
- **FR-008**: If the developer cancels before explicit confirmation, the system MUST NOT insert any records.
- **FR-009**: The system MUST insert records only; rollback, deletion, and replacement behavior are out of scope for this feature.
- **FR-010**: The system MUST validate the dataset successfully before direct seeding begins.
- **FR-011**: The system MUST insert collections sequentially in the dataset's generationOrder so parent collections are inserted before dependent collections.
- **FR-012**: The system MUST generate one UUID v4 seedBatchId per direct seeding operation.
- **FR-013**: The system MUST assign the same seedBatchId to every record inserted by one direct seeding operation while preserving existing record fields.
- **FR-014**: The insertion report MUST include the seedBatchId, successful collections, failed collections, inserted record counts, and error summaries.
- **FR-015**: If insertion partially fails, the insertion report MUST identify collections that succeeded and collections that failed.
- **FR-016**: The system MUST preserve seedBatchId and inserted collection/count information needed by a future rollback feature.
- **FR-017**: The system MUST close database client connections after connection tests and after direct seeding operations, including success, failure, and cancellation paths.
- **FR-018**: This feature MUST be limited to the core seeding capability and MUST NOT add rollback implementation, JSON export changes, JavaScript export changes, feedback regeneration changes, project history persistence of connection strings, or UI redesign.
- **FR-019**: Direct seeding MUST use the MongoDB native driver for connection tests and insert operations in this epic.
- **FR-020**: Direct seeding status, connection test proof, and confirmation behavior MUST be representable without storing connection strings.

### Key Entities

- **Direct Seeding Request**: The developer's active operation containing a transient connection string, generated dataset, target database, and explicit confirmation state.
- **Connection Test Result**: A success or failure result that determines whether direct seeding can proceed for the active connection string, including a non-secret success token/fingerprint when the test passes.
- **Confirmation Summary**: The pre-insertion review generated from the dataset and generationOrder showing target database name, target collections, per-collection record counts, total record count, and the irreversible-without-rollback warning.
- **Seed Batch**: One confirmed insertion operation identified by a single UUID v4 seedBatchId shared by all inserted records.
- **Insertion Report**: The structured operation result containing seedBatchId, successful collections, failed collections, per-collection inserted counts, error summaries, and rollback-support metadata.
- **Generated Dataset**: The grouped generated records and generation order used to determine insertion order.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of direct seeding attempts are blocked until a successful connection test token exists and matches the active connection string.
- **SC-002**: 100% of cancelled confirmation flows insert zero records.
- **SC-003**: 100% of confirmed successful seeding operations tag every inserted record with one shared seedBatchId.
- **SC-004**: 100% of insertion reports include seedBatchId and per-collection counts.
- **SC-005**: 100% of partial failure reports distinguish succeeded collections from failed collections.
- **SC-006**: 100% of tested success, failure, and cancellation paths close the database client connection after the operation.
- **SC-007**: No connection string appears in stored records, saved run data, saved datasets, logs, analytics, operation reports, or user-facing responses during verification.
- **SC-008**: Multi-collection datasets are inserted sequentially in the provided generationOrder in all ordering verification cases.
- **SC-009**: 100% of invalid datasets are blocked before insertion begins.
- **SC-010**: 100% of connection tests complete successfully or fail within the configured 5-10 second timeout window.

## Assumptions

- The developer already has a generated dataset ready for insertion.
- The active connection string is supplied by the developer at operation time and is not reused unless supplied again.
- Successful connection test tokens are non-secret, short-lived operation proofs and do not contain the connection string.
- The target database name is derived from the active connection context and shown before insertion.
- The generated dataset includes generationOrder that represents safe insertion order.
- seedBatchId values are generated with UUID v4 semantics per confirmed seeding operation and are safe to include in inserted records and reports.
- Future rollback will use seedBatchId and per-collection insertion information, but rollback execution is outside this feature.
- This feature is scoped to core direct seeding behavior; API routes, persistence workflows, and any UI beyond confirmation/status reporting may be planned in later epics.
