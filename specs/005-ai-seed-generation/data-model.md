# Data Model: AI Seed Generation

## Generation Request

Represents a user's request to generate seed data from a reviewed schema.

Fields:

- `projectId`: Saved project identifier.
- `actorId`: Authenticated user identifier from the session.
- `schemaSnapshotId`: Active reviewed schema snapshot used for generation.
- `schema`: Reviewed schema with collections and fields.
- `projectContext`: Optional description and repository-derived context summary.
- `collectionCounts`: Map of collection name to requested non-negative record count.
- `maxAttempts`: Bounded number of generation attempts.

Validation:

- User must own or have access to the project.
- Project must have an active schema snapshot.
- Collection names in `collectionCounts` must exist in the reviewed schema.
- Counts must be non-negative integers.
- Total generated record count must not exceed the configured safe generation limit.
- A child collection count cannot require references to a parent collection with count zero unless the field is optional and omitted.

## Collection Generation Plan

Represents generation instructions for one collection.

Fields:

- `collectionName`: Reviewed collection name.
- `count`: Requested generated record count.
- `dependencyOrder`: Numeric order after dependency sorting.
- `fields`: Reviewed fields for this collection.
- `requiredFields`: Required reviewed field names.
- `enumFields`: Fields with allowed values.
- `uniqueFields`: Fields requiring duplicate checks.
- `referenceFields`: ObjectId fields that reference other reviewed collections.
- `warnings`: Planning warnings for low-confidence, missing, or cyclic relationships.

Relationships:

- Derived from `ParsedSchema.collections[]`.
- Belongs to one generation request.
- Participates in the dependency graph.

Validation:

- Parent collections must be ordered before dependent child collections.
- Missing referenced collections create blocking validation issues.
- Cycles create blocking validation issues unless explicitly handled by optional references.

## Dependency Graph

Represents collection-to-collection reference dependencies.

Fields:

- `nodes`: Collection names.
- `edges`: Directed links from child collection to referenced parent collection.
- `orderedCollections`: Collections sorted so parents are generated first.
- `cycles`: Collection names participating in cyclic references.
- `missingReferences`: Reference fields that point to absent collections.

Validation:

- Accepted generation plans must have no blocking cycles.
- Accepted generation plans must have no missing referenced parent collections.
- Parent collection counts must support child references.

## Generated Dataset

Represents the complete generated output grouped by collection.

Fields:

- `projectId`: Saved project identifier.
- `schemaSnapshotId`: Schema snapshot used for generation.
- `status`: `valid`, `invalid`, or `failed`.
- `collections`: Generated records grouped by collection name.
- `collectionCounts`: Actual generated counts by collection.
- `generationOrder`: Collection names in parent-first order.
- `validationResults`: Validation results for the dataset.
- `warnings`: Non-blocking generation warnings.
- `createdAt`: Time the dataset was produced.

Validation:

- Accepted datasets must be valid JSON grouped by reviewed collection names.
- Accepted datasets must contain exactly the requested number of records per generated collection.
- Accepted datasets must contain no extra collections.
- Accepted datasets must pass reference, type, required field, enum, and uniqueness checks.

## Generated Record

Represents one generated document candidate.

Fields:

- `id`: Stable generated identifier.
- `collectionName`: Collection this record belongs to.
- `values`: Field-value map.
- `validationResults`: Field-level validation results.

Validation:

- Required fields must be present.
- Field values must match reviewed field types.
- Enum fields must use allowed values.
- Unique fields must not duplicate values within the generated collection.
- Reference fields must point to existing generated records in the referenced parent collection.
- Nested objects and arrays must match reviewed child field or item metadata when available.

## Validation Result

Represents validation feedback for a generated dataset or record.

Fields:

- `severity`: `error` or `warning`.
- `collectionName`: Affected collection.
- `recordId`: Optional generated record identifier.
- `fieldName`: Optional affected field.
- `code`: Stable validation code.
- `message`: User-facing explanation.
- `suggestedAction`: Optional guidance for correcting counts, schema review data, or project context.

Validation:

- Blocking errors prevent the dataset from being accepted.
- Warnings may be shown while still allowing users to review valid output.

## Generation Attempt

Represents one attempt to ask the generation provider for records.

Fields:

- `attemptNumber`: Starts at 1.
- `status`: `requested`, `malformed_output`, `validation_failed`, `accepted`, or `failed`.
- `validationFeedback`: Sanitized feedback used for retry.
- `providerSummary`: Sanitized provider outcome summary.

Validation:

- Attempts must not store prompts containing secrets or raw provider responses that include sensitive data.
- Retry attempts must stop at the configured maximum.

## Chat Refinement Request

Represents a user's chat instruction for editing or understanding a generated dataset.

Fields:

- `projectId`: Saved project identifier.
- `actorId`: Authenticated user identifier from the session.
- `schemaSnapshotId`: Schema snapshot used by the current dataset.
- `currentDataset`: Last accepted generated dataset grouped by collection.
- `message`: User's natural-language chat instruction.
- `chatHistory`: Sanitized user-facing prior messages and assistant responses.
- `validationContext`: Current warnings or validation notes available to guide refinement.

Validation:

- User must own or have access to the project.
- Current dataset must have status `valid`.
- Message must be non-empty and within the configured size limit.
- Current dataset must match the active reviewed schema snapshot.
- Chat history must not include raw prompts, raw provider payloads, API keys, credentials, or connection strings.

## Chat Refinement Response

Represents the result of an AI chat refinement request.

Fields:

- `mode`: `updated_dataset`, `guidance`, or `rejected`.
- `message`: User-facing assistant response.
- `dataset`: Optional updated generated dataset when a mutating refinement succeeds.
- `validationResults`: Validation results for attempted dataset changes.
- `warnings`: Non-blocking refinement warnings.
- `chatHistory`: Updated sanitized user-facing chat history.

Validation:

- `updated_dataset` responses must include a dataset with status `valid`.
- `guidance` responses must not mutate the current dataset.
- `rejected` responses must preserve the current valid dataset.
- Any updated dataset must preserve grouped JSON, collection counts unless explicitly changed safely, schema constraints, uniqueness, and valid references.
