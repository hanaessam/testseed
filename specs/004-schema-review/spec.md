# Feature Specification: Schema Review

**Feature Branch**: `004-schema-review`

**Created**: 2026-06-07

**Status**: Draft

**Input**: User description: "check the requirements.md file in docs and implement Schema Review"

## Clarifications

### Session 2026-06-07

- Q: Should Schema Review be editable? -> A: Limited edits are supported for field type, required status, inferred enum values, references, and warnings.
- Q: How should low-confidence fields affect the next step? -> A: Users can continue to generation with visible warnings and conservative assumptions.
- Q: What schema edits should be saved as the project's active schema snapshot? -> A: Save the reviewed schema, including user edits and warnings.
- Q: Should users be able to remove fields or collections during Schema Review? -> A: No removal is allowed; users can only correct detected field details.
- Q: How should enum-like values be handled in review? -> A: Users can edit inferred enum-like values, while declared enum values are read-only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review Detected Collections and Fields (Priority: P1)

As an authenticated developer, I want to review detected collections and fields before generation so I can confirm that TestSeed understands my database shape.

**Why this priority**: Schema review is the required checkpoint between schema input/discovery and generation. It prevents users from generating data from misunderstood structure.

**Independent Test**: Can be fully tested by parsing or discovering a schema with multiple collections and confirming the review shows each collection, field, type, and field rule clearly.

**Acceptance Scenarios**:

1. **Given** a schema has been parsed or discovered, **When** the developer reaches schema review, **Then** all detected collections are visible with field counts.
2. **Given** a developer selects a collection, **When** the field review is displayed, **Then** each field shows its name, likely type, required-looking status, uniqueness, enum values when available, references when available, and warnings.
3. **Given** the developer corrects supported field details, **When** they save the reviewed schema, **Then** the active schema snapshot includes those edits and warnings.

---

### User Story 2 - Understand Inference Confidence and Warnings (Priority: P2)

As an authenticated developer, I want uncertain schema details and low-confidence inferences to be marked clearly so I can decide whether to continue, revise input, or switch input methods.

**Why this priority**: MongoDB-discovered schemas are inferred from samples, so review must reveal sparse fields, mixed types, empty collections, and weak relationships.

**Independent Test**: Can be fully tested with sparse and inconsistent sample documents and confirming low-confidence fields show warnings while still allowing the developer to continue with conservative assumptions.

**Acceptance Scenarios**:

1. **Given** a field appears in only some sample documents, **When** review shows the field, **Then** the field is marked optional or uncertain with a warning.
2. **Given** a field has mixed sampled types, **When** review shows the field, **Then** the type is presented conservatively with a low-confidence warning.
3. **Given** review contains warnings, **When** the developer continues to generation, **Then** generation remains available with visible warnings and conservative assumptions.

---

### User Story 3 - Review Enum-Like Values (Priority: P3)

As an authenticated developer, I want enum-like field values highlighted so generated data can stay within likely allowed categories.

**Why this priority**: Enum-like values help generated records feel realistic and avoid invalid categories, especially when schemas are discovered from existing documents rather than formal definitions.

**Independent Test**: Can be fully tested with manual enum definitions and discovered low-cardinality string values, then confirming likely enum values are displayed in schema review.

**Acceptance Scenarios**:

1. **Given** a manual schema field declares enum values, **When** review shows the field, **Then** those values are listed as read-only declared values.
2. **Given** a discovered field has repeated low-cardinality string values, **When** review shows the field, **Then** the review highlights the values as editable inferred enum-like values.
3. **Given** sampled values are too varied or too sparse, **When** review shows the field, **Then** the system does not invent enum values.

---

### User Story 4 - Review Possible References (Priority: P4)

As an authenticated developer, I want ObjectId-like fields and relationship naming patterns highlighted so I can check likely relationships before generation.

**Why this priority**: Reference review supports dependency-ordered generation and valid relational seed data, while still making inferred relationships visibly advisory.

**Independent Test**: Can be fully tested by reviewing schemas with explicit references and discovered identifier-like fields, then confirming the target collection or warning appears.

**Acceptance Scenarios**:

1. **Given** a field has an explicit reference, **When** review shows the field, **Then** the referenced collection is highlighted.
2. **Given** a discovered field looks like an identifier and its name suggests another collection, **When** review shows the field, **Then** the likely target collection is highlighted.
3. **Given** a field looks like an identifier but does not clearly map to a collection, **When** review shows the field, **Then** it is shown as a possible reference without overstating certainty.

### Edge Cases

- No schema has been parsed or discovered yet.
- A schema contains no collections.
- A collection contains no fields.
- A field has nested object children.
- A field is an array of primitives or objects.
- A field has enum values from a manual schema.
- A discovered field has low-cardinality repeated values that look enum-like.
- A discovered field has too many varied values to be treated as enum-like.
- A field has warnings from sparse, mixed, or low-confidence inference.
- A field references another collection explicitly or through naming patterns.
- A developer attempts to remove a detected field or collection during review.
- A developer edits inferred enum-like values while declared enum values remain read-only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST show a schema review after successful manual parsing or MongoDB discovery.
- **FR-002**: System MUST display detected collections and field counts.
- **FR-003**: System MUST display field names, likely types, required-looking status, uniqueness, enum values, references, and warnings.
- **FR-004**: System MUST display nested object fields and array item information when available.
- **FR-005**: System MUST clearly mark low-confidence or uncertain inferred fields.
- **FR-006**: System MUST show collection-level warnings when collections are empty or inference is limited.
- **FR-007**: System MUST highlight explicit references and likely references inferred from identifier-like fields or naming patterns.
- **FR-008**: System MUST highlight enum-like values from manual schemas or discovered low-cardinality sampled values.
- **FR-009**: System MUST avoid inventing enum values, relationships, fields, or warnings when evidence is missing.
- **FR-010**: System MUST allow the developer to save the reviewed schema for the active project.
- **FR-011**: System MUST preserve review details such as warnings, confidence, nested fields, enum values, and references when a reviewed schema is saved.
- **FR-012**: System MUST keep schema review separate from sensitive connection inputs and account secrets.
- **FR-013**: System MUST allow limited schema review edits for field type, required status, inferred enum-like values, references, and warnings.
- **FR-014**: System MUST NOT allow users to remove detected fields or collections during Schema Review.
- **FR-015**: System MUST save the reviewed schema, including supported user edits and warnings, as the active project schema snapshot.
- **FR-016**: System MUST allow users to continue toward generation when low-confidence fields exist, provided warnings remain visible and conservative assumptions are used.
- **FR-017**: System MUST allow editing inferred enum-like values and MUST keep declared enum values read-only.

### Key Entities

- **Schema Review**: The user-visible summary of parsed or discovered schema structure before generation, including supported field-level corrections.
- **Reviewed Collection**: A detected collection with fields, field count, source, and collection-level warnings.
- **Reviewed Field**: A detected field with type, required-looking status, uniqueness, enum-like values, reference information, confidence, nested children, and warnings.
- **Review Warning**: A message explaining uncertain inference, sparse data, mixed types, empty collections, or weak relationships.
- **Reference Suggestion**: An explicit or inferred relationship shown to the developer for review before generation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% of users can identify all detected collections and choose a collection to inspect in under 30 seconds.
- **SC-002**: 90% of reviewed fields display name, type, and rule details without horizontal scrolling on common laptop screens.
- **SC-003**: 100% of low-confidence inferred fields display a visible warning or uncertainty marker.
- **SC-004**: 100% of manual enum fields and qualifying discovered enum-like fields display their candidate values.
- **SC-005**: 100% of explicit references and qualifying inferred references display the likely target or uncertainty.
- **SC-006**: 0 schema review screens display MongoDB connection strings, access tokens, passwords, or other secrets.
- **SC-007**: 100% of saved reviewed schemas preserve supported user edits and warnings in the active schema snapshot.
- **SC-008**: 100% of removal attempts for detected fields or collections are unavailable or blocked during Schema Review.

## Assumptions

- Schema review follows either manual schema parsing or MongoDB schema discovery.
- Discovered schema details may be inferred and therefore can include confidence and warnings.
- Manual schema definitions remain the stronger source for explicit enums, uniqueness, required fields, and references.
- Developers can continue with low-confidence inferred schemas when warnings are visible.
- Schema review is a checkpoint before record-count selection and seed generation.
- Schema Review supports limited correction, not full schema authoring.
