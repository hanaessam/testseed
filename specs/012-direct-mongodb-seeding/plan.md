# Implementation Plan: Direct MongoDB Seeding

**Branch**: `014-direct-mongodb-seeding` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-direct-mongodb-seeding/spec.md`

## Summary

Add core direct seeding use cases that can test a transient MongoDB connection, prepare a confirmation summary from a generated dataset, and execute confirmed insert-only seeding in `dataset.generationOrder`. The implementation will validate datasets before insertion, use MongoDB native-driver semantics for ping and inserts, assign one UUID v4 `seedBatchId` per operation, return structured success/partial-failure reports, close clients on all paths, and avoid storing or returning connection strings.

No rollback implementation, JSON export changes, JavaScript export changes, feedback regeneration changes, project history connection-string persistence, API routes, or web UI redesign are planned.

## Technical Context

**Language/Version**: TypeScript strict, Node.js 20+

**Primary Dependencies**: Existing `@testseed/types` contracts, `packages/core/src/generation/validate-generated-dataset.ts`, MongoDB native driver package, native-driver adapter interfaces, Node `crypto.randomUUID()`, Node `crypto.createHash()` for non-secret connection fingerprints

**Storage**: User target MongoDB database receives inserted records only during confirmed seeding. TestSeed application storage is not changed and must not receive connection strings.

**Testing**: Jest in `packages/core`

**Target Platform**: Core package use case consumed by future app/API surfaces

**Project Type**: TestSeed monorepo core module

**Performance Goals**: Connection tests succeed or fail within a configured 5-10 second timeout; seeding processes collections sequentially and reports per-collection results without retry loops or background jobs.

**Constraints**:

- Implement core behavior in `packages/core`.
- Preserve dependency rules: core may import `@testseed/types` only from workspace packages and must not import `@testseed/db`, `apps/api`, or `apps/web`.
- Use MongoDB native-driver behavior for ping and insert operations through a concrete core adapter plus fakeable interfaces for tests.
- Do not import Express, Next.js, or Mongoose in core.
- Require a successful connection test token/fingerprint for the same active connection string before confirmed seeding can begin; do not store the connection string itself.
- Validate datasets before seeding begins.
- Insert collections sequentially in `dataset.generationOrder`.
- Generate one UUID v4 `seedBatchId` per confirmed operation and preserve existing record fields.
- Close MongoDB clients after connection tests and seeding operations on success and failure paths.
- Never store, log, persist, or return connection strings.
- Keep rollback execution out of scope; preserve rollback-support metadata in reports only.

**Scale/Scope**: One core direct seeding feature covering connection test, confirmation summary, confirmed insert execution, and structured report generation for one generated dataset.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
| --- | --- | --- |
| Dependency direction preserved | Pass | Core imports only `@testseed/types` from workspace packages; MongoDB access is external/native-driver infrastructure passed into or isolated inside the core module. |
| No business logic in apps | Pass | Feature is planned as core-only; API/web integration is excluded. |
| No framework imports in core | Pass | Plan excludes Express, Next.js, and Mongoose imports. |
| Connection strings remain transient | Pass | Requests accept connection strings only for active operations; contracts explicitly exclude connection strings from reports, persistence, logs, and analytics. |
| Direct seeding gated by prior connection test | Pass | Design adds a non-secret connection test token/fingerprint produced after ping success and required by seeding execution. |
| Dataset validation before mutation | Pass | Direct seeding must call existing dataset validation before any insert begins. |
| Test-first core behavior | Pass | Plan requires focused Jest coverage for connection test, confirmation, success, validation block, cancellation/no-confirmation, partial failure, ordering, seedBatchId, and client closure. |

## Project Structure

### Documentation (this feature)

```text
specs/012-direct-mongodb-seeding/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- direct-mongodb-seeding-core.md
`-- checklists/
    `-- requirements.md
```

### Source Code

```text
packages/types/src/
`-- generation.ts

packages/core/src/generation/
|-- direct-mongodb-seeding.ts
|-- direct-mongodb-native-driver.ts
|-- index.ts
`-- __tests__/
    `-- direct-mongodb-seeding.test.ts
```

**Structure Decision**: Add direct seeding as a core generation use case beside existing generated dataset validation and export modules. Public request/result/error contracts belong in `packages/types/src/generation.ts`; core orchestration and test doubles remain in `packages/core/src/generation/direct-mongodb-seeding.ts`; the concrete MongoDB native-driver adapter lives in `packages/core/src/generation/direct-mongodb-native-driver.ts`.

## Phase 0: Research

See [research.md](./research.md). Resolved decisions:

- Use MongoDB native-driver ping for connection testing with a 5-10 second timeout.
- Keep native-driver access behind core-owned minimal interfaces so Jest tests can fake the client and core does not depend on application persistence.
- Provide a concrete core native-driver adapter for production callers while keeping tests on fake clients.
- Use a non-secret connection test token/fingerprint to prove the active connection string passed ping before seeding; the token is returned by connection testing and must match the seeding request connection string, without storing or returning the string.
- Generate confirmation summaries from `dataset.generationOrder` and dataset counts before insertion.
- Reuse `validateGeneratedDataset` as the pre-insert validation gate.
- Insert records sequentially by collection and stop after the first collection failure.
- Generate `seedBatchId` with UUID v4 semantics and add it to inserted document copies without mutating the original dataset.
- Return rollback-support metadata in the report without implementing rollback.

## Phase 1: Design & Contracts

Design artifacts:

- [data-model.md](./data-model.md)
- [contracts/direct-mongodb-seeding-core.md](./contracts/direct-mongodb-seeding-core.md)
- [quickstart.md](./quickstart.md)

## Implementation Approach

1. Add public direct seeding request/result/error types to `packages/types/src/generation.ts`.
2. Add `packages/core/src/generation/direct-mongodb-seeding.ts` with three core functions: connection testing, confirmation summary building, and confirmed seeding execution.
3. Add the MongoDB native driver package to `packages/core` and implement `packages/core/src/generation/direct-mongodb-native-driver.ts` as the concrete adapter for native-driver `MongoClient`, `db.command({ ping: 1 })`, and `insertMany`.
4. Define minimal core-side Mongo client/database/collection interfaces or dependency factories so tests can use fakes and production callers can use the native-driver adapter.
5. Implement connection testing with trimmed transient connection strings, ping, timeout handling, non-secret connection test token/fingerprint output, and `finally` client closure.
6. Build confirmation summaries from target database name, `dataset.generationOrder`, and actual dataset collection lengths, including per-collection and total counts.
7. Block seeding when explicit confirmation is absent, when a matching successful connection test token/fingerprint is absent, when the dataset is empty, when validation returns blocking errors, or when generationOrder omits non-empty collections.
8. During execution, generate one `seedBatchId`, copy each record with `seedBatchId`, and insert collections sequentially in `dataset.generationOrder`.
9. Stop after a collection insert failure, report successful and failed collections with inserted counts and sanitized error summaries, and preserve rollback metadata for successful collections.
10. Ensure no returned result or error includes the connection string.
11. Export the new functions from `packages/core/src/generation/index.ts` and `packages/core/src/index.ts` through the existing barrel.
12. Cover all acceptance criteria and edge cases with focused Jest tests using fake clients, fake insert failures, fake timers where needed, and adapter tests/mocks for native-driver option mapping.

## Complexity Tracking

No complexity violations.

## Post-Design Constitution Check

| Gate | Status | Notes |
| --- | --- | --- |
| Dependency direction preserved | Pass | Design keeps direct seeding in core and shared contracts in types only. |
| No business logic in apps | Pass | No app files are included in the implementation structure. |
| No framework imports in core | Pass | Core design uses no Express, Next.js, or Mongoose. |
| Connection strings remain transient | Pass | Data model and contracts exclude connection strings from all outputs and persistence. |
| Direct seeding gated by prior connection test | Pass | Data model and tasks require a matching connection test token/fingerprint before insert execution. |
| Dataset validation before mutation | Pass | Validation gate precedes any insert in the implementation approach. |
| Test-first core behavior | Pass | Quickstart and implementation approach require focused Jest coverage before handoff. |
