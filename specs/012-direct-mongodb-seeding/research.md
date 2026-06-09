# Research: Direct MongoDB Seeding

## Decision: Test Connections With Native-Driver Ping and Short Timeout

**Rationale**: The feature requires MongoDB native-driver behavior and a clear success/failure result before direct seeding is available. A ping command verifies that the client can connect to the target database without reading collections or inserting data. A 5-10 second timeout keeps invalid connection strings from hanging the user flow.

**Alternatives considered**:

- List collections as the connection test: rejected because it performs broader database inspection than needed.
- Delay testing until insertion: rejected because direct seeding must remain unavailable until a working connection string is provided.
- Long default timeout: rejected because failed connection feedback should be prompt and testable.

## Decision: Keep MongoDB Access Behind Minimal Core Interfaces

**Rationale**: Core must remain independent from `packages/db`, apps, and framework code while still supporting native-driver operations. A small client factory/database/collection interface lets production callers adapt the MongoDB native driver and lets core tests use deterministic fake clients.

**Alternatives considered**:

- Import `@testseed/db`: rejected by dependency direction and because `packages/db` owns TestSeed persistence, not user target databases.
- Put direct seeding in `apps/api`: rejected because business logic belongs in core and this epic is core implementation only.
- Use Mongoose models: rejected by the core hard rule and because user schemas may not have local model files.

## Decision: Generate Confirmation From Dataset and generationOrder

**Rationale**: Confirmation must reflect exactly what would be inserted. Using the dataset and `dataset.generationOrder` provides target collection names, per-collection counts, total count, and order without needing persistence or UI state.

**Alternatives considered**:

- Use schema collection list only: rejected because it may include zero-record collections and does not prove insertion order.
- Use caller-provided counts only: rejected because counts can drift from actual dataset contents.

## Decision: Reuse Existing Dataset Validation Before Seeding

**Rationale**: `validateGeneratedDataset` already checks count mismatches, schema membership, type errors, uniqueness issues, and unresolved references. Direct seeding should not duplicate validation logic or trust stale dataset status.

**Alternatives considered**:

- Trust `dataset.status`: rejected because callers may pass stale or modified datasets.
- Validate only references: rejected because invalid field types or required fields should also block insertion.

## Decision: Sequential Insert and Stop on First Collection Failure

**Rationale**: Dependency-order insertion means parent collections must be inserted before child collections. Sequential processing makes partial failure reports deterministic and avoids inserting dependent records after a parent or earlier dependency fails.

**Alternatives considered**:

- Parallel insert all collections: rejected because it can violate dependency order.
- Continue after a collection failure: rejected because later collections may depend on failed inserts and would make rollback scope harder to understand.
- Automatic cleanup after failure: rejected because rollback implementation is out of scope for this epic.

## Decision: Add seedBatchId to Copied Records Only

**Rationale**: Every inserted record must receive the same operation batch identifier while existing record fields are preserved. Copying records before insertion avoids mutating the generated dataset object and keeps saved datasets free of rollback metadata unless a future persistence flow deliberately records it.

**Alternatives considered**:

- Mutate dataset records in place: rejected because it can leak operational metadata back into preview/export flows.
- Use one batch ID per collection: rejected because rollback needs one operation-level identifier.

## Decision: Structured Reports Exclude Sensitive Inputs

**Rationale**: Reports must include seedBatchId, collection success/failure, counts, sanitized error summaries, and rollback-support metadata, but connection strings must never be returned, logged, or persisted. A structured report gives future API/UI layers a safe contract.

**Alternatives considered**:

- Return raw driver errors: rejected because they may include sensitive connection details.
- Return only a success boolean: rejected because partial failure and future rollback require per-collection detail.
