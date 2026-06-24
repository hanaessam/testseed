# Feature Specification: Export JavaScript Seed Script

**Feature Branch**: `012-export-js-seed-script`

**Created**: 2026-06-09

**Status**: Shipped

**Input**: User description: "Epic #15 Export [core]. As a developer, I want to export a JavaScript seed script so I can run it in a local or CI environment. Acceptance criteria: The user can generate a ready-to-run JavaScript seed script. The generated script inserts records in dependency order. The script includes comments explaining required environment variables or connection setup. If the dataset contains unresolved references, the script is not generated until the issue is fixed. Scope: Implement the export logic in the core package. Do not depend on the web UI. Reuse existing dataset validation and dependency ordering logic where possible. Return a clear error when unresolved references exist. Output should be deterministic and formatted as readable JavaScript."

## Clarifications

### Session 2026-06-09

- Q: What ready-to-run JavaScript script format should export generate? -> A: CommonJS Node.js script using the MongoDB native driver and `MONGODB_URI`.
- Q: How should MongoDB ObjectId values be represented in the generated script? -> A: Convert generated `_id` and ObjectId reference fields to MongoDB `ObjectId(...)` values.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Ready-to-Run Seed Script (Priority: P1)

As a developer with a valid generated dataset, I can export a JavaScript seed script so I can run the data insertion manually in a local or CI environment.

**Why this priority**: This is the primary user value: developers need a portable script they can run outside TestSeed.

**Independent Test**: Can be tested by providing a valid generated dataset and confirming the export result is a readable JavaScript script containing the generated records and run/setup guidance.

**Acceptance Scenarios**:

1. **Given** a valid generated dataset, **When** the developer requests a JavaScript seed script, **Then** the system returns a ready-to-run script containing the generated records.
2. **Given** a generated script, **When** the developer reads it, **Then** the script includes comments explaining required environment variables or connection setup.
3. **Given** the same valid dataset and schema context, **When** the developer exports a script more than once, **Then** the script output is deterministic and readable.
4. **Given** a generated script, **When** the developer prepares to run it locally or in CI, **Then** it is a CommonJS Node.js script that uses the MongoDB native driver and a `MONGODB_URI` environment variable.
5. **Given** generated records include `_id` values and ObjectId references, **When** the script is generated, **Then** those MongoDB identity/reference values are emitted as `ObjectId(...)` expressions rather than plain strings.

---

### User Story 2 - Preserve Dependency Order (Priority: P1)

As a developer exporting related collections, I want the script to insert records in dependency order so referenced parent records exist before dependent records are inserted.

**Why this priority**: Dependency order is required for reliable manual seeding when generated records include references.

**Independent Test**: Can be tested with a dataset containing parent and child collections and confirming the script inserts parent collections before dependent collections.

**Acceptance Scenarios**:

1. **Given** a valid dataset with referenced parent and child collections, **When** the script is generated, **Then** parent collection inserts appear before child collection inserts.
2. **Given** a dataset with multiple collections and no unresolved references, **When** the script is generated, **Then** collection insertion order follows the validated dependency order.

---

### User Story 3 - Block Scripts With Unresolved References (Priority: P1)

As a developer, I want script generation blocked when generated data contains unresolved references so I do not run a script that inserts broken relationships.

**Why this priority**: A script that inserts invalid references can corrupt the target database or require manual cleanup.

**Independent Test**: Can be tested by providing a dataset with an unresolved reference and confirming no script is returned and a clear error explains the problem.

**Acceptance Scenarios**:

1. **Given** a dataset with an unresolved reference, **When** the developer requests a JavaScript seed script, **Then** the system does not generate the script.
2. **Given** script generation is blocked by unresolved references, **When** the error is returned, **Then** the message clearly identifies that references must be fixed before script export.

---

### Edge Cases

- If the dataset is missing or empty, script export is rejected with a clear message.
- If collection dependency order cannot be determined safely, script export is rejected or reports the ordering problem clearly.
- If the dataset has non-reference validation errors, script export is rejected because only valid generated records should be exported.
- If collection names or field values contain characters that require escaping in JavaScript, the output remains valid readable JavaScript.
- If the same input is exported repeatedly, formatting and ordering remain stable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST generate a ready-to-run JavaScript seed script from a valid generated dataset.
- **FR-002**: The generated script MUST include records grouped by collection.
- **FR-003**: The generated script MUST insert collections in dependency order so parent records are inserted before dependent records.
- **FR-004**: The generated script MUST include comments explaining required environment variables or database connection setup.
- **FR-005**: The generated script output MUST be deterministic for the same input.
- **FR-006**: The generated script output MUST be formatted as readable JavaScript.
- **FR-007**: The system MUST reject script generation when the dataset contains unresolved references.
- **FR-008**: Rejection for unresolved references MUST return a clear error message that explains the blocking issue.
- **FR-009**: The system MUST reject script generation when the generated dataset has blocking validation errors.
- **FR-010**: Script export logic MUST be available from the core package and MUST NOT depend on the web UI.
- **FR-011**: Script export SHOULD reuse existing dataset validation and dependency ordering behavior where possible.
- **FR-012**: The generated script MUST be a CommonJS Node.js script that uses the MongoDB native driver and reads the database connection from `MONGODB_URI`.
- **FR-013**: The generated script MUST convert generated `_id` values and ObjectId reference fields to MongoDB `ObjectId(...)` expressions.

### Key Entities

- **Generated Dataset**: The generated records to include in the script, including collection groups, validation status, generation order, and references.
- **JavaScript Seed Script**: The deterministic readable CommonJS Node.js script returned to the developer for local or CI execution with the MongoDB native driver, `MONGODB_URI`, and MongoDB `ObjectId(...)` expressions for generated ObjectId values.
- **Collection Dependency Order**: The safe insertion order that ensures referenced records are inserted before records that depend on them.
- **Unresolved Reference Error**: A blocking error returned when a record references a missing or invalid parent record.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of valid datasets used in verification produce a JavaScript seed script rather than an error.
- **SC-002**: 100% of generated scripts for related collections insert parent collections before dependent collections.
- **SC-003**: 100% of datasets with unresolved references are blocked from script export.
- **SC-004**: 100% of unresolved-reference failures include an understandable error message naming reference validity as the blocker.
- **SC-005**: Re-exporting the same valid input produces byte-for-byte identical script output in verification.
- **SC-006**: The export behavior can be verified without using or rendering the web UI.

## Assumptions

- The script is intended for manual local or CI use by developers who can provide a database connection through environment variables or equivalent setup.
- The ready-to-run script format is CommonJS Node.js using the MongoDB native driver and `MONGODB_URI`.
- Generated `_id` values and ObjectId reference fields should be emitted as MongoDB `ObjectId(...)` expressions in the script.
- Generated scripts are insert-only and do not drop collections, delete existing records, or perform cleanup.
- A valid generated dataset has already been produced by TestSeed generation or regeneration workflows.
- Dependency order is derived from the reviewed schema and generated dataset metadata.
- Direct insertion from TestSeed, rollback, JSON export, feedback regeneration, and preview editing are out of scope for this feature.
