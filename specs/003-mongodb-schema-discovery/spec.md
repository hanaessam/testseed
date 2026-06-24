# Feature Specification: MongoDB Schema Discovery

**Feature Branch**: `003-mongodb-schema-discovery`

**Created**: 2026-06-06

**Status**: Shipped

**Input**: User description: "check the requirements.md file in docs and implement MongoDB Schema Discovery"

## Clarifications

### Session 2026-06-07

- Q: How many documents should discovery inspect per collection? -> A: Inspect up to 20 sampled documents per collection, with a clear warning when sample size is limited.
- Q: Should successful discovery save schema results automatically? -> A: Keep discovery results transient until the user reviews and explicitly saves the schema.
- Q: How should MongoDB connection errors be shown? -> A: Show sanitized user-friendly error categories such as invalid format, unreachable host, authentication failed, or timeout.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Schema From MongoDB (Priority: P1)

As an authenticated developer, I want to connect to an existing MongoDB database and retrieve schema information automatically so I can continue seed generation without manually pasting Mongoose schemas.

**Why this priority**: Automatic discovery is the core value of this feature and unlocks the workflow for users whose schema is best represented by an existing database with sample documents.

**Independent Test**: Can be fully tested by entering a valid connection string for a database with multiple populated collections, running discovery, and confirming the schema review shows collections, fields, likely field types, nested objects, arrays, and warnings.

**Acceptance Scenarios**:

1. **Given** an authenticated developer has a reachable database with populated collections, **When** they run MongoDB schema discovery, **Then** the system returns a reviewable schema summary grouped by collection.
2. **Given** discovered documents contain nested objects or arrays, **When** discovery completes, **Then** the review shows those structures clearly enough for the developer to understand the generated-data shape.
3. **Given** discovered fields appear in only some sampled documents or have mixed values, **When** discovery completes, **Then** the review marks those fields as uncertain rather than presenting them as definitive.

---

### User Story 2 - Test Connection Safely (Priority: P2)

As an authenticated developer, I want to test my MongoDB connection before relying on it for schema discovery so I can correct connection problems without losing my place in the workflow.

**Why this priority**: Connection testing gives users fast feedback and supports the security requirement that connection strings are used only for the active operation.

**Independent Test**: Can be fully tested by submitting valid and invalid connection details and confirming the user sees success or correction messages without the connection string being stored or displayed later.

**Acceptance Scenarios**:

1. **Given** an authenticated developer enters a valid connection string, **When** they test the connection, **Then** the system confirms that the database can be reached.
2. **Given** the connection string is invalid, unreachable, or unauthorized, **When** the developer tests or runs discovery, **Then** the system shows a clear connection error and does not continue to schema review.
3. **Given** connection testing or discovery finishes, **When** the developer leaves the screen or refreshes later, **Then** the connection string is not shown as saved project data.

---

### User Story 3 - Handle Empty or Low-Confidence Databases (Priority: P3)

As an authenticated developer, I want clear guidance when discovery cannot infer a reliable schema so I can switch to manual schema input or continue with conservative assumptions.

**Why this priority**: MongoDB may have empty collections, sparse documents, or inconsistent document shapes, and the feature must make those limits visible.

**Independent Test**: Can be fully tested by running discovery against an empty database, a database with empty collections, and a database with inconsistent documents, then confirming each result includes appropriate warnings and next-step guidance.

**Acceptance Scenarios**:

1. **Given** the target database contains no collections, **When** discovery runs, **Then** the system tells the developer no collections were found and suggests manual schema input.
2. **Given** a collection contains no sample documents, **When** discovery runs, **Then** the collection is listed with an empty-sample warning instead of invented fields.
3. **Given** documents are sparse or inconsistent, **When** discovery runs, **Then** fields with low confidence are marked as uncertain and generation can proceed only with visible warnings.

---

### User Story 4 - Review Inferred Relationships (Priority: P4)

As an authenticated developer, I want possible references highlighted when field values or names suggest relationships so generated records can preserve likely connections between collections.

**Why this priority**: Relationship discovery improves downstream seed generation quality, but inferred references must be presented as suggestions because database samples may be incomplete.

**Independent Test**: Can be fully tested by discovering collections with identifier-like fields and confirming possible relationships are highlighted with warnings when confidence is not high.

**Acceptance Scenarios**:

1. **Given** a sampled field contains identifier-like values, **When** discovery completes, **Then** the review highlights it as a possible reference.
2. **Given** a field name suggests a relationship to another collection, **When** discovery completes, **Then** the review includes the possible target collection when it can be inferred.
3. **Given** reference evidence is weak, **When** discovery completes, **Then** the relationship is shown as uncertain rather than guaranteed.

### Edge Cases

- The developer submits an empty, malformed, unreachable, or unauthorized connection string.
- Raw MongoDB driver errors could include sensitive host, username, or connection details and must be converted to sanitized user-facing categories.
- The database is reachable but contains no collections.
- One or more collections are empty.
- Sample documents contain fields that appear only rarely.
- Sample documents contain mixed types for the same field.
- Sample documents contain deeply nested objects or arrays.
- Values look like identifiers but do not clearly match a known collection.
- The discovery operation cannot complete because the database is temporarily unavailable.
- The developer retries discovery after correcting the connection string.
- Sensitive connection details must not appear in saved project context, logs, schema snapshots, or user-facing review output.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide MongoDB schema discovery as a schema input option for authenticated users.
- **FR-002**: System MUST allow users to submit a MongoDB connection string for the active connection test or discovery operation.
- **FR-003**: System MUST test whether the submitted connection can reach the target database and return clear success or failure feedback.
- **FR-003a**: System MUST show sanitized connection failure categories, such as invalid format, unreachable host, authentication failed, or timeout, without exposing raw connection details.
- **FR-004**: System MUST inspect available collections when discovery runs successfully.
- **FR-005**: System MUST inspect sample documents from each discovered collection when samples are available.
- **FR-005a**: System MUST inspect up to 20 sampled documents per collection and show a warning when the sample cap limits confidence.
- **FR-006**: System MUST infer field names, likely field types, nested objects, and arrays from sampled documents.
- **FR-007**: System MUST identify possible reference fields when field values or naming patterns suggest relationships.
- **FR-008**: System MUST mark inferred fields or references as uncertain when sampled evidence is sparse, mixed, or incomplete.
- **FR-009**: System MUST provide collection-level warnings when no collections are found, a collection has no samples, or inference confidence is low.
- **FR-010**: System MUST let users proceed to schema review after successful discovery.
- **FR-010a**: System MUST keep discovered schema results transient until the user reviews and explicitly saves them as the active schema snapshot.
- **FR-011**: System MUST guide users toward manual schema input when discovery cannot find any useful structure.
- **FR-012**: System MUST use MongoDB connection strings only for the active operation and MUST NOT store or display them afterward.
- **FR-013**: System MUST keep discovered schema information separate from project domain context and account information.
- **FR-014**: System MUST ensure discovery results are associated only with the authenticated user's active project or workflow.
- **FR-015**: System MUST avoid inventing fields, types, or relationships when database evidence is missing.

### Key Entities

- **Discovery Request**: A user-initiated attempt to test a database connection or infer schema information from a reachable database.
- **Discovered Collection**: A collection found during discovery, including its name, sampled-document status, inferred fields, possible references, and warnings.
- **Inferred Field**: A field observed in sampled documents, including its path, likely type, required-looking status, confidence, nested children, and warnings.
- **Possible Reference**: A suggested relationship inferred from identifier-like values or relationship-like field names.
- **Discovery Warning**: A user-facing message that explains connection problems, empty data, sparse samples, mixed types, or uncertain relationships.
- **Discovered Schema Review**: The user-visible schema summary that can be reviewed before record-count selection and seed generation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% of users with a valid connection to a populated database can reach schema review in under 2 minutes.
- **SC-002**: 100% of invalid, unreachable, or unauthorized connection attempts show a clear correction message without exposing sensitive connection details.
- **SC-003**: For representative sample databases, discovery identifies at least 90% of top-level fields present in sampled documents.
- **SC-004**: For representative nested sample documents, discovery displays nested objects and arrays clearly enough for 90% of test users to identify the expected record shape.
- **SC-005**: 100% of empty databases and empty collections produce explicit warnings and do not invent fields.
- **SC-006**: 100% of sparse, mixed-type, or weak-reference findings are marked as uncertain in review samples.
- **SC-007**: 0 saved project records, schema snapshots, user-facing review screens, or security review samples contain submitted MongoDB connection strings.

## Assumptions

- Users are authenticated before using MongoDB schema discovery.
- Discovery relies on available collections and sampled documents, so it produces inferred schema information rather than a guaranteed formal schema.
- Manual schema input remains available when discovery is not useful.
- Connection strings are transient operation inputs and are never saved as project context or schema metadata.
- Reference detection is advisory and conservative unless sampled evidence is strong.
- Discovery does not insert, update, or delete user database records.
