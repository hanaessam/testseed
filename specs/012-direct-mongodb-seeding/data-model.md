# Data Model: Direct MongoDB Seeding

## DirectMongoConnectionTestRequest

Represents a transient connection test.

Fields:

- `connectionString`: caller-provided MongoDB connection string for this operation only.
- `timeoutMs`: optional timeout clamped or defaulted to the supported 5-10 second window.

Validation rules:

- Connection string must be non-empty after trimming.
- Connection string must never be stored, logged, persisted, or returned.
- Database client must be closed after success or failure.

## DirectMongoConnectionTestResult

Represents a safe connection test outcome.

Fields:

- `ok`: boolean success indicator.
- `databaseName`: target database name when available.
- `connectionTestToken`: non-secret token proving this exact active connection string passed the test, returned only on success.
- `connectionFingerprint`: non-secret one-way fingerprint used to compare the tested connection string with the seeding request without storing the string.
- `message`: safe developer-facing status.
- `errorSummary`: sanitized failure summary when the test fails.

Validation rules:

- Must not include the connection string.
- Failure result keeps direct seeding unavailable.
- Successful result provides a connection test token/fingerprint that expires or is scoped to the active operation.

## DirectSeedingConfirmationSummary

Represents the pre-insertion confirmation data.

Fields:

- `targetDatabaseName`: database name that will receive inserts.
- `orderedCollections`: collection names from `dataset.generationOrder` that have records.
- `collectionCounts`: per-collection record counts calculated from dataset contents.
- `totalRecordCount`: total number of records to insert.
- `warning`: fixed warning that insertion is irreversible without rollback.

Validation rules:

- Must be derived from the dataset and generationOrder.
- Non-empty dataset collections must be represented.
- Must not include the connection string.

## DirectSeedingRequest

Represents a confirmed insert-only seeding operation.

Fields:

- `connectionString`: caller-provided MongoDB connection string for this operation only.
- `schema`: reviewed schema used for validation.
- `dataset`: generated dataset to insert.
- `targetDatabaseName`: expected target database name or resolved connection database name.
- `confirmed`: explicit confirmation flag/action.
- `connectionTestToken`: token from a successful connection test for the same active connection string.
- `timeoutMs`: optional connection timeout.

Validation rules:

- `confirmed` must be true before insertion begins.
- `connectionTestToken` must be present and must match the active connection string fingerprint before insertion begins.
- Dataset validation must succeed before insertion begins.
- Dataset must include at least one record.
- `dataset.generationOrder` must include every non-empty collection.
- Connection string must never be stored, logged, persisted, or returned.

## Seed Batch

Represents one direct seeding operation.

Fields:

- `seedBatchId`: UUID v4 identifier generated once per confirmed operation.
- `startedAt`: operation timestamp if exposed by implementation.
- `orderedCollections`: insertion order used for the operation.

Validation rules:

- Every inserted record receives the same seedBatchId.
- Existing record fields are preserved.
- The generated dataset object is not mutated.

## Inserted Collection Result

Represents per-collection insertion status.

Fields:

- `collectionName`: collection inserted or attempted.
- `requestedCount`: records planned for insertion.
- `insertedCount`: records successfully inserted.
- `status`: `succeeded` or `failed`.
- `errorSummary`: sanitized error summary for failed collections.

Validation rules:

- Successful collections include inserted counts.
- Failed collections include safe error summaries.
- Failed summaries must not include connection strings.

## DirectSeedingReport

Represents the operation result.

Fields:

- `seedBatchId`: operation batch identifier.
- `targetDatabaseName`: target database name.
- `successfulCollections`: successful collection results.
- `failedCollections`: failed collection results.
- `insertedRecordCounts`: per-collection inserted counts.
- `totalInsertedCount`: total inserted records.
- `rollback`: rollback-support metadata for successfully inserted records.

Validation rules:

- Returned for full success and partial failure.
- Must distinguish succeeded collections from failed collections.
- Must preserve seedBatchId and collection/count information needed by future rollback.
- Must not include the connection string.

## DirectSeedingError

Represents a rejected operation before insertion can begin.

Error categories:

- Missing or invalid connection string.
- Connection test failed or timed out.
- Missing or mismatched successful connection test token.
- Confirmation missing.
- Dataset empty.
- Dataset validation failed.
- Unsafe generation order.

Validation rules:

- Must include a stable error code and safe message.
- Must not include connection strings.
- Validation errors may be included when they are already safe dataset validation results.
