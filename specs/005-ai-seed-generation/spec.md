# Feature Specification: AI Seed Generation

**Feature Branch**: `005-ai-seed-generation`

**Created**: 2026-06-07

**Status**: Draft

**Input**: User description: "we will be adding a new epic which is the AI Seed Generation, which helps me in a case of if I want realistic records generated in dependency order so ObjectId references are valid."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Valid Relational Seed Records (Priority: P1)

As an authenticated developer with a reviewed schema, I want TestSeed to generate realistic records in dependency order so that records referencing other collections contain valid ObjectId references.

**Why this priority**: This is the core value of the epic. Without realistic records and valid relationships, users still need to manually repair generated seed data.

**Independent Test**: Can be tested by selecting a reviewed schema with at least one parent collection and one child collection, choosing record counts, generating records, and confirming that referenced parent records exist before child records use them.

**Acceptance Scenarios**:

1. **Given** a reviewed schema with a parent collection and a child collection containing a reference field, **When** the user requests seed generation, **Then** parent records are generated before child records and every child reference points to an existing generated parent record.
2. **Given** a reviewed schema with required fields, enum values, and known field types, **When** the user generates records, **Then** the generated records include required fields, use allowed enum values, and match the reviewed field types.
3. **Given** generation completes successfully, **When** the user views the result, **Then** records are grouped by collection with stable identifiers that make relationships inspectable.

---

### User Story 2 - Choose Record Counts Per Collection (Priority: P2)

As a developer, I want to choose how many records to generate for each collection so I can create datasets that fit my testing or demo scenario.

**Why this priority**: Record counts make generation practical for different project sizes and prevent users from receiving too much or too little data.

**Independent Test**: Can be tested by selecting multiple collections, setting different counts for each one, generating records, and confirming that each collection returns exactly the requested count unless a documented validation issue prevents completion.

**Acceptance Scenarios**:

1. **Given** a reviewed schema with multiple collections, **When** the user sets a count for each collection and starts generation, **Then** the generated dataset includes the requested number of records per collection.
2. **Given** a user requests a count that exceeds the safe generation limit, **When** the user attempts to generate records, **Then** the system explains the limit and asks the user to reduce the count or split the request.
3. **Given** a collection is optional for the user's scenario, **When** the user sets that collection count to zero, **Then** the system omits records for that collection and warns if other generated collections require references to it.

---

### User Story 3 - Handle Invalid or Incomplete Generated Output (Priority: P3)

As a developer, I want TestSeed to validate generated records and recover from malformed or schema-invalid output so I can trust the dataset before preview, export, or insertion.

**Why this priority**: AI-generated data must be treated as a draft. Users need clear recovery when generated output is malformed, incomplete, or violates the reviewed schema.

**Independent Test**: Can be tested by simulating malformed output and schema-invalid records, then confirming that the system retries when appropriate and otherwise returns actionable validation messages without presenting invalid data as complete.

**Acceptance Scenarios**:

1. **Given** generation returns malformed record data, **When** the system detects the issue, **Then** it retries with corrective context before showing a failure to the user.
2. **Given** generated records violate required fields, enum values, field types, uniqueness, or references, **When** validation runs, **Then** invalid records are regenerated or shown with clear validation errors.
3. **Given** repeated generation attempts cannot produce a valid dataset, **When** the attempt limit is reached, **Then** the user receives a clear failure summary and can revise schema review details, record counts, or project context before trying again.

---

### User Story 4 - Use Project Context for Realistic Values (Priority: P4)

As a developer, I want generated values to reflect my project description and reviewed schema so the seed data feels realistic for my application's domain.

**Why this priority**: Valid data is necessary, but domain-relevant data is what makes TestSeed useful for demos, QA, and development.

**Independent Test**: Can be tested by providing a project description, generating records, and confirming that names, categories, statuses, amounts, and descriptive fields reflect the stated domain while still respecting schema constraints.

**Acceptance Scenarios**:

1. **Given** a project description and reviewed schema, **When** the user generates records, **Then** generated text, numeric ranges, and categorical values are plausible for that project domain.
2. **Given** the project context is empty, **When** the user generates records, **Then** the system still produces schema-valid data and warns that values may be generic.
3. **Given** project context conflicts with schema constraints, **When** records are generated, **Then** schema constraints take priority and the user is informed if context could only be partially reflected.

---

### User Story 5 - Refine Generated Dataset Through AI Chat (Priority: P5)

As a developer reviewing generated seed data, I want to chat with the AI about specific changes so I can refine details without manually editing every record.

**Why this priority**: Initial generation may be valid but still need domain-specific tuning. A chat box lets users request targeted refinements while TestSeed continues enforcing schema validity and reference integrity.

**Independent Test**: Can be tested by generating a valid dataset, submitting a chat instruction such as "make user emails use a university domain", and confirming the returned dataset reflects the requested change while still passing schema, enum, required-field, uniqueness, and reference validation.

**Acceptance Scenarios**:

1. **Given** a valid generated dataset is displayed, **When** the user asks the chat box to modify specific values, **Then** the system returns an updated dataset grouped by collection and preserves valid references.
2. **Given** the user requests a refinement that conflicts with the reviewed schema, **When** the AI responds, **Then** schema constraints take priority and the user receives a clear explanation of what could not be changed.
3. **Given** the AI refinement response is malformed or invalid, **When** validation runs, **Then** the system retries or rejects the refinement without replacing the current valid dataset.
4. **Given** the user asks the chat box a general question about the generated dataset, **When** no data change is needed, **Then** the system can respond with guidance without altering the generated records.

---

### Edge Cases

- A schema has no collections or no fields available after review.
- A child collection requests records but its referenced parent collection count is zero.
- Multiple collections reference each other or appear to form a cycle.
- A reference field points to a collection that is missing from the reviewed schema.
- A required field has an unknown or mixed type after schema review.
- A collection contains unique fields and the requested count makes duplicate values likely.
- A requested dataset is too large for a single generation attempt.
- Generated output is malformed, missing collections, contains extra collections, or includes fields not present in the reviewed schema.
- Generated values satisfy field type checks but look unrealistic for the provided project context.
- A chat refinement asks for values that violate required fields, field types, enum values, uniqueness, or references.
- A chat refinement targets a collection or field that does not exist in the reviewed schema.
- A chat message is ambiguous and cannot be safely translated into a dataset change.
- A chat refinement returns valid JSON but attempts to remove records required by child references.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated users to start seed generation only after a schema has been reviewed and is available for generation.
- **FR-002**: System MUST allow users to choose a non-negative record count for each reviewed collection.
- **FR-003**: System MUST show the expected total number of generated records before generation begins.
- **FR-004**: System MUST enforce a clear maximum safe record count for one generation request and explain the limit when exceeded.
- **FR-005**: System MUST generate records grouped by collection.
- **FR-006**: System MUST determine collection dependency order from reviewed reference information before generating dependent records.
- **FR-007**: System MUST generate parent collection records before child collection records whenever references require parent records.
- **FR-008**: System MUST assign stable identifiers to generated records so reference fields can point to existing generated records.
- **FR-009**: System MUST ensure every generated reference value points to an existing generated record in the referenced collection.
- **FR-010**: System MUST respect reviewed required fields, field types, enum values, uniqueness indicators, nested fields, arrays, and reference metadata.
- **FR-011**: System MUST use available project context to make generated values realistic for the user's domain while preserving schema validity.
- **FR-012**: System MUST still generate schema-valid records when project context is empty, while warning that values may be generic.
- **FR-013**: System MUST validate generated records before presenting them as complete.
- **FR-014**: System MUST retry or repair malformed generated output before failing the generation request.
- **FR-015**: System MUST report validation failures with collection names, field names, and understandable reasons.
- **FR-016**: System MUST prevent invalid generated datasets from being marked ready for preview, export, direct insertion, or rollback tracking.
- **FR-017**: System MUST avoid exposing internal prompts, secret values, account credentials, connection strings, or raw provider errors in user-facing generation results.
- **FR-018**: System MUST preserve the reviewed schema and user-selected record counts used for a generation attempt so users can understand what produced the dataset.
- **FR-019**: System SHOULD recommend count or schema-review adjustments when references, cycles, missing parent records, or low-confidence fields make valid generation difficult.
- **FR-020**: System MUST provide a clear completion state that distinguishes successful generation, recoverable validation errors, and failed generation.
- **FR-021**: System MUST provide a chat box for authenticated users to request targeted refinements to a generated dataset.
- **FR-022**: System MUST include the current generated dataset, reviewed schema constraints, validation context, and user chat instruction when requesting an AI refinement.
- **FR-023**: System MUST validate every AI-refined dataset before replacing the currently displayed valid dataset.
- **FR-024**: System MUST preserve the current valid dataset if a chat refinement is malformed, invalid, unsafe, or cannot be completed.
- **FR-025**: System MUST support non-mutating chat responses when the user asks questions or requests guidance rather than a dataset change.
- **FR-026**: System MUST show user-facing chat history and refinement status without exposing prompts, raw provider responses, secrets, credentials, connection strings, or raw provider errors.

### Key Entities *(include if feature involves data)*

- **Generation Request**: Represents a user's request to generate seed data, including selected project, reviewed schema, requested record counts, and project context summary.
- **Collection Generation Plan**: Represents one collection's generation target, including collection name, record count, dependency position, required fields, enum constraints, unique fields, and reference fields.
- **Generated Dataset**: Represents the complete generated output grouped by collection, including generated records, identifiers, relationship links, validation status, and warnings.
- **Generated Record**: Represents one generated document candidate with field values, stable identifier, collection name, and validation results.
- **Validation Result**: Represents success, warning, or failure information for generated records, including affected collection, field, reason, and suggested correction.
- **Dependency Graph**: Represents collection-to-collection reference dependencies used to decide generation order and detect missing or circular relationships.
- **Chat Refinement Request**: Represents a user's natural-language instruction for changing or understanding a generated dataset.
- **Chat Refinement Response**: Represents either an updated validated dataset or a non-mutating guidance response, with validation results and user-facing messages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a schema-valid dataset for a reviewed schema with at least three related collections in under 2 minutes for typical demo-sized counts.
- **SC-002**: 100% of generated reference fields in accepted datasets point to an existing generated record in the referenced collection.
- **SC-003**: At least 95% of generated records in accepted datasets satisfy required field, type, enum, and uniqueness checks before preview.
- **SC-004**: Users can set record counts for all reviewed collections and see the expected total before starting generation.
- **SC-005**: When generation fails validation, users receive a clear collection-and-field-level explanation for every blocking issue.
- **SC-006**: At least 80% of generated datasets for schemas with project context include domain-relevant values that a reviewer judges plausible for the stated project.
- **SC-007**: Users can submit a chat refinement against a valid generated dataset and receive either a validated updated dataset or a clear non-mutating explanation.
- **SC-008**: 100% of accepted chat-refined datasets continue to satisfy reference integrity and reviewed schema constraints before replacing the current displayed dataset.

## Assumptions

- Users are authenticated before accessing seed generation.
- A project and reviewed schema already exist from the project context, manual schema input, MongoDB schema discovery, and schema review flows.
- The initial generation scope is demo-sized datasets rather than very large production-scale seed batches.
- Schema constraints take priority over project-context realism whenever the two conflict.
- Generated datasets are previewed and validated before export or direct insertion.
- Manual record editing, export, direct MongoDB insertion, and rollback are related downstream epics and are not required for the first AI Seed Generation slice.
