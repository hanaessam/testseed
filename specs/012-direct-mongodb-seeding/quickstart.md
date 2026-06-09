# Quickstart: Direct MongoDB Seeding

## Goal

Verify the core direct seeding use cases can test a MongoDB connection, produce a confirmation summary, insert a valid dataset in dependency order, tag inserted records with one seedBatchId, and report partial failures without leaking connection strings.

## Core Verification

1. Add or run focused Jest tests for `packages/core/src/generation/direct-mongodb-seeding.ts`.
2. Use fake MongoDB client/database/collection objects instead of a real database for core tests.
3. Provide a valid parsed schema with parent and child collections.
4. Provide a valid generated dataset whose `generationOrder` is parent-first.
5. Test connection success:
   - Fake client connects.
   - Fake database responds to ping.
   - Result is `ok: true`.
   - Result includes a non-secret `connectionTestToken` and `connectionFingerprint`.
   - Client `close()` is called.
   - Result does not contain the connection string.
6. Build confirmation:
   - Summary includes target database name.
   - Summary includes ordered collections.
   - Summary includes per-collection counts and total count.
   - Summary includes the irreversible-without-rollback warning.
7. Execute confirmed seeding:
   - Request includes a matching `connectionTestToken` from a successful connection test.
   - Dataset validation passes before insert.
   - One UUID v4 seedBatchId is generated.
   - Parent collection inserts before dependent collection.
   - Inserted records include seedBatchId and preserve existing fields.
   - Input dataset is not mutated.
   - Report includes seedBatchId, successful collections, and inserted counts.
   - Client `close()` is called.

## Failure Verification

1. Connection failure:
   - Fake connect or ping fails.
   - Result is `ok: false`.
   - Error summary is sanitized.
   - Client `close()` is called.
   - Result does not contain the connection string.
2. Missing confirmation:
   - Request seeding without explicit confirmation.
   - No client is created and no insert is attempted.
3. Missing or mismatched connection test token:
   - Request seeding without a successful connection test token or with a token for a different connection string.
   - No client is created and no insert is attempted.
4. Invalid dataset:
   - Provide unresolved references or other validation errors.
   - Seeding is rejected before any insert.
5. Unsafe generation order:
   - Omit a non-empty collection from `dataset.generationOrder`.
   - Seeding is rejected before any insert.
6. Native-driver adapter:
   - Mock the MongoDB native driver.
   - Confirm adapter creates `MongoClient` with timeout options.
   - Confirm adapter delegates ping through `db.command({ ping: 1 })`.
   - Confirm adapter delegates inserts through `collection(name).insertMany(records)`.
7. Partial failure:
   - Fake one collection insert succeeds and the next fails.
   - Report includes successful and failed collections.
   - Report includes inserted counts and sanitized error summary.
   - No later collections are inserted.
   - Report preserves seedBatchId and rollback-support metadata for successful collections.

## Scope Verification

Confirm implementation does not require changes to:

- `apps/web/`
- `apps/api/`
- `packages/db/`
- Rollback execution.
- JSON export behavior.
- JavaScript export behavior.
- Feedback regeneration behavior.
- Project history connection-string persistence.

## Final Check

Run:

```sh
npx.cmd turbo build lint test
```
