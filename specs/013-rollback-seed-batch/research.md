# Research: Rollback Seed Batch

## Decision: Use existing seed batch metadata for duplicate rollback prevention

**Rationale**: The clarification selected updating existing/direct seeding metadata with rollback status and deleted counts. This satisfies the requirement to reject already rolled back batches without creating a separate rollback history collection.

**Alternatives considered**:

- Separate rollback marker collection: rejected because it adds persistence beyond the minimum needed.
- Treat absence of records as already rolled back: rejected because the spec requires a distinct no-record error and an already-rolled-back error.

## Decision: Store explicit generation collection order on the seed batch

**Rationale**: Rollback must process collections in reverse generation order. A `Record<string, string[]>` can be awkward as an ordering source and should not be the only source of dependency order. An explicit `collectionOrder: string[]` on `SeedBatch` makes the rollback order testable and stable.

**Alternatives considered**:

- Infer order from object key insertion order: rejected because it is less explicit and makes the contract harder to validate.
- Recompute dependency order from schema during rollback: rejected because rollback should use the actual direct seeding order and avoid extra schema dependencies.

## Decision: Delete by seedBatchId tag, not by stored document IDs alone

**Rationale**: The acceptance criteria state that rollback operates only on records tagged with the specified `seedBatchId`. Filtering by `seedBatchId` protects against accidental deletion if stored IDs are stale, corrupted, or overlap with unrelated documents.

**Alternatives considered**:

- Delete by `_id` lists from metadata: rejected because it does not directly enforce the seedBatchId tag constraint.
- Delete all records matching generated collection counts: rejected because it is unsafe and unrelated to the batch tag.

## Decision: Reject empty/no-record batches before mutation

**Rationale**: The spec requires a no-record error when no records exist for the seedBatchId. Core can detect this from seed batch metadata before opening or using a user database connection if `insertedDocumentIds` and `collectionCounts` contain no records.

**Alternatives considered**:

- Attempt deletes and return zero counts: rejected because the acceptance criteria require an error.
- Mark no-record batches as rolled back: rejected because no rollback occurred.

## Decision: Stop on first collection deletion failure

**Rationale**: Rollback is destructive. Stopping at the first failed collection keeps partial state easier to report and reason about, while preserving completed collection counts and the failed collection detail. This also aligns with the direct seeding plan's first-failure policy.

**Alternatives considered**:

- Continue deleting remaining collections: rejected because it expands partial failure blast radius.
- Return only a fatal error with no counts: rejected because the spec requires distinguishing completed and failed collections.

## Decision: Keep API rollback as adapter-only

**Rationale**: The project already has `apps/api/src/routes/rollback.ts`, but the architecture rules prohibit business logic in apps. The route should handle auth, Zod request parsing, transient connection open/close, and native-driver collection deletion; all eligibility, ordering, and report decisions should remain in core.

**Alternatives considered**:

- Core-only with no API changes: rejected if the existing route remains unsafe or inconsistent with the new core contract.
- Move MongoDB driver access into `packages/db`: rejected because `packages/db` owns TestSeed application persistence, not transient user database mutation.

## Decision: Sanitize reports and errors

**Rationale**: Connection strings must remain transient and must never appear in reports, errors, logs, persisted history, or saved datasets. Rollback results should include collection names, counts, seedBatchId, status, and safe failure summaries only.

**Alternatives considered**:

- Return raw driver errors: rejected because they may include sensitive connection details.
- Persist raw failure payloads: rejected because rollback history beyond minimal metadata is out of scope.
