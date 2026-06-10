# Quickstart: Rollback Seed Batch

## Goal

Validate rollback planning and implementation for `specs/013-rollback-seed-batch` without storing connection strings or deleting unrelated data.

## Prerequisites

- Node.js 20+
- npm 10+
- Dependencies installed with `npm install`
- A test MongoDB database for manual adapter verification, if API-level checks are run

## Core Test Flow

1. Add or update focused tests in `packages/core/src/projects/__tests__/rollback-seed-batch.test.ts`.
2. Cover these cases before implementation:
   - missing, empty, or whitespace `seedBatchId`
   - invalid-format `seedBatchId`
   - unknown seed batch
   - already rolled back seed batch
   - batch with no inserted records
   - reverse collection order from stored `collectionOrder`
   - deletion dependency receives `collectionName` and `seedBatchId`, not only document ids
   - records from other seed batches are not delete targets
   - successful rollback marks existing seed batch metadata with rollback status, timestamp, and deleted counts
   - partial failure stops on first failed collection and returns completed counts plus failed collection
   - project event payload contains safe rollback details only
3. Run:

```sh
npm --workspace @testseed/core test
```

## Persistence Checks

1. Update `packages/types/src/projects.ts` with the seed batch metadata fields.
2. Update `packages/db/src/models/seed-batch.ts` and `packages/db/src/repositories/project-history-repository.ts`.
3. Run:

```sh
npm --workspace @testseed/db run lint
```

## API Adapter Checks

1. Keep `apps/api/src/routes/rollback.ts` as adapter-only code.
2. Verify request validation, authentication, transient MongoDB connection close, and sanitized error mapping.
3. Run:

```sh
npm --workspace @testseed/api test
```

## Full Gate

Run the required project check before handoff:

```sh
npx turbo build lint test
```

## Manual Safety Verification

Use a disposable database only.

1. Insert records into two collections with the same `seedBatchId`.
2. Insert extra records with a different `seedBatchId` and records with no `seedBatchId`.
3. Record seed batch metadata with `collectionOrder` in parent-first order.
4. Run rollback.
5. Confirm:
   - deletion order is reverse of `collectionOrder`
   - only matching `seedBatchId` records are deleted
   - other batch and untagged records remain
   - report includes deleted counts by collection
   - seed batch metadata is marked `rolled_back`
   - no connection string appears in output, metadata, events, or logs
