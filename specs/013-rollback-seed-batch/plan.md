# Implementation Plan: Rollback Seed Batch

**Branch**: `015-rollback-seed-batch` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/013-rollback-seed-batch/spec.md`

## Summary

Add safe rollback for direct MongoDB seed batches. The core use case validates a provided `seedBatchId`, confirms the seed batch exists and has not already been rolled back, deletes only records tagged with that `seedBatchId`, processes collections in reverse generation order, records minimal rollback metadata on the existing seed batch, and returns a structured report with per-collection deleted counts.

The implementation will keep business rules in `packages/core`, shared contracts in `packages/types`, TestSeed metadata persistence in `packages/db`, and any HTTP/MongoDB wiring in `apps/api` as adapter-only code. No web UI changes, long-term rollback history, stored connection strings, or unrelated data deletion are planned.

## Technical Context

**Language/Version**: TypeScript strict, Node.js 20+

**Primary Dependencies**: Existing `@testseed/types` project history contracts, `packages/core/src/projects/rollback-seed-batch.ts`, `packages/db` seed batch repository/model, MongoDB native driver behavior for user-database deletes, Express 4 adapter only if the existing rollback route is hardened

**Storage**: Existing TestSeed `seed_batches` metadata collection stores rollback status, rollback timestamp, rollback deleted counts, and generation collection order. User target MongoDB database is connected to only for the active rollback operation.

**Testing**: Jest in `packages/core`; TypeScript contract checks in `packages/types`, `packages/db`, and `apps/api`; existing `npx turbo build lint test` quality gate

**Target Platform**: TestSeed monorepo packages consumed by API/web surfaces

**Project Type**: TypeScript monorepo feature spanning shared contracts, core use case, persistence adapter, and optional existing API adapter hardening

**Performance Goals**: Rollback processes each collection once, sequentially in reverse generation order, with no retries or background jobs. Per-collection deletion is a single filtered delete operation scoped by `seedBatchId`.

**Constraints**:

- Preserve dependency direction: `packages/types -> packages/db -> packages/core -> apps/api -> apps/web`.
- Keep rollback business rules in `packages/core`.
- Keep `packages/core` free of Express, Next.js, Mongoose, and `@testseed/db` imports.
- Use dependency-injected interfaces for metadata lookup, metadata updates, collection deletion, and event append.
- Delete only documents where the target record is tagged with the specified `seedBatchId`; never rely on `_id` alone.
- Reject missing, whitespace, invalid-format, unknown, already rolled back, and empty/no-record batches before any delete operation.
- Process collections in reverse stored generation order.
- Stop on the first collection deletion failure and return completed counts plus failed collection details.
- Close MongoDB clients after success, failure, and rejection paths that open a connection.
- Never store, log, return, or persist MongoDB connection strings.
- Do not add web UI changes or rollback history beyond minimal fields on existing seed batch metadata.

**Scale/Scope**: One rollback use case for one seed batch at a time, covering validation, dependency-safe deletion order, minimal duplicate rollback prevention, report generation, and adapter wiring needed to support the existing route.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
| --- | --- | --- |
| Dependency direction preserved | Pass | Shared contracts stay in `packages/types`; persistence stays in `packages/db`; core receives dependency interfaces; API is adapter-only. |
| No business logic in apps | Pass | Apps may validate HTTP shape and wire dependencies, but rollback decisions remain in core. |
| No framework imports in core | Pass | Core design excludes Express, Next.js, and Mongoose. |
| No Mongoose in core | Pass | Seed batch persistence is handled by `packages/db`; core receives plain `SeedBatch` values and functions. |
| Connection strings remain transient | Pass | Rollback requests may use a connection string only for the active operation; contracts exclude it from reports, events, metadata, and logs. |
| Destructive safety | Pass | Deletes are filtered by `seedBatchId`, rejected states happen before deletion, and other batches/untagged records are explicitly protected. |
| Test-first behavior | Pass | Plan requires focused tests for every rejection path, reverse order, tag-scoped deletes, partial failure, metadata update, event payload, and client closure. |

## Project Structure

### Documentation (this feature)

```text
specs/013-rollback-seed-batch/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
`-- contracts/
    `-- rollback-seed-batch.md
```

### Source Code

```text
packages/types/src/
|-- projects.ts
`-- index.ts

packages/db/src/
|-- models/
|   `-- seed-batch.ts
`-- repositories/
    `-- project-history-repository.ts

packages/core/src/projects/
|-- rollback-seed-batch.ts
|-- index.ts
`-- __tests__/
    `-- rollback-seed-batch.test.ts

apps/api/src/routes/
|-- rollback.ts
`-- __tests__/
    `-- rollback.contracts.test.ts
```

**Structure Decision**: Extend the existing rollback files instead of creating a new feature folder. Shared seed batch/report shape belongs in `packages/types/src/projects.ts`; pure orchestration belongs in `packages/core/src/projects/rollback-seed-batch.ts`; metadata persistence belongs in `packages/db`; the existing API route remains a thin adapter for auth, Zod request validation, transient MongoDB connection management, and dependency injection.

## Phase 0: Research

See [research.md](./research.md). Resolved decisions:

- Use existing seed batch metadata as the duplicate rollback guard, with rollback status and deleted counts recorded on the seed batch.
- Add generation collection order to seed batch metadata if the direct seeding record does not already preserve it explicitly.
- Delete records by `seedBatchId` tag, not by `_id` lists alone.
- Reverse the stored generation order to calculate rollback order.
- Stop on the first collection deletion failure and return a partial report.
- Keep connection strings transient and sanitize all errors/reports.

## Phase 1: Design & Contracts

Design artifacts:

- [data-model.md](./data-model.md)
- [contracts/rollback-seed-batch.md](./contracts/rollback-seed-batch.md)
- [quickstart.md](./quickstart.md)

## Implementation Approach

1. Update `SeedBatch` in `packages/types/src/projects.ts` with explicit `collectionOrder`, optional `rollbackDeletedCounts`, and any report/result types needed by core/API.
2. Update `packages/db/src/models/seed-batch.ts` and `project-history-repository.ts` to persist and return the new metadata fields.
3. Update direct seeding batch recording so seed batch metadata includes the original generation collection order.
4. Rewrite `rollbackSeedBatch` in `packages/core/src/projects/rollback-seed-batch.ts` to trim/validate `seedBatchId`, load the batch, reject unsafe states, derive reverse order, call a dependency that deletes by collection name and `seedBatchId`, and mark rollback completion with deleted counts.
5. Model rollback failures as structured, sanitized errors/results so connection strings and raw driver details are not returned.
6. Ensure rollback stops on first collection deletion failure and returns completed collection counts plus the failed collection name and safe reason.
7. Append a project event for successful rollback completion; do not append connection strings or unsafe error details.
8. Harden `apps/api/src/routes/rollback.ts` only as an adapter: validate body, open the transient user MongoDB connection through the approved MongoDB native-driver rollback mechanism, use native-driver `deleteMany({ seedBatchId })` per collection, close in `finally`, and delegate all eligibility/order/report logic to core.
9. Add focused core Jest tests before implementation for missing/whitespace/invalid IDs, unknown batch, already rolled back batch, no records, reverse order, tag-scoped deletion, partial failure, metadata update, and event payload.
10. Add adapter/contract checks for request validation, authentication, transient connection closure, and no connection-string leakage.
11. Export updated rollback contracts/functions through existing package barrels.
12. Run `npx turbo build lint test` before handoff.

## Complexity Tracking

No complexity violations.

## Post-Design Constitution Check

| Gate | Status | Notes |
| --- | --- | --- |
| Dependency direction preserved | Pass | Design uses existing package boundaries and workspace imports only. |
| No business logic in apps | Pass | API route performs validation and infrastructure wiring only. |
| No framework imports in core | Pass | Core remains TypeScript use-case code with injected dependencies. |
| No Mongoose in core | Pass | Mongoose remains in `packages/db`; user DB deletes are adapter-provided. |
| Connection strings remain transient | Pass | Data model, contracts, quickstart, and approach exclude connection strings from persistence and output. |
| Destructive safety | Pass | Deletion contract is explicitly `seedBatchId` scoped and reverse ordered. |
| Test-first behavior | Pass | Quickstart requires targeted tests before the final turbo gate. |
