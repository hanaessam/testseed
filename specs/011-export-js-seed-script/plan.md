# Implementation Plan: Export JavaScript Seed Script

**Branch**: `012-export-js-seed-script` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-export-js-seed-script/spec.md`

## Summary

Add a pure core export use case that turns a valid generated dataset into a deterministic, readable CommonJS JavaScript seed script. The script uses the MongoDB native driver, reads the connection string from `MONGODB_URI`, emits generated `_id` and ObjectId reference fields as `ObjectId(...)`, inserts records in dependency order, and refuses to generate when validation detects unresolved references or other blocking errors.

No web UI, direct seeding, rollback, JSON export, feedback regeneration, or preview editing changes are planned.

## Technical Context

**Language/Version**: TypeScript strict, Node.js 20+

**Primary Dependencies**: Existing `@testseed/types` contracts, `packages/core/src/generation/validate-generated-dataset.ts`, and `packages/core/src/generation/build-generation-plan.ts`

**Storage**: N/A. The core use case returns script text only and does not connect to MongoDB or persist data.

**Testing**: Jest in `packages/core`

**Target Platform**: Core package use case consumed by future app/API surfaces

**Project Type**: TestSeed monorepo core module

**Performance Goals**: Script generation should complete synchronously for normal generated dataset sizes currently supported by the generation safe limit.

**Constraints**:

- Implement export logic in `packages/core`.
- Do not depend on `apps/web`, Express, Next.js, Mongoose, database clients, or environment variables.
- Reuse existing validation and dependency ordering logic where possible.
- Return clear errors for unresolved references and other blocking validation errors.
- Output must be deterministic and readable.
- Conservative planning assumption: generated scripts are insert-only and do not drop, delete, or clean up existing data.

**Scale/Scope**: One core use case for JavaScript seed script export from one generated dataset and reviewed schema.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
| --- | --- | --- |
| Dependency direction preserved | Pass | Core imports only `@testseed/types` and local core generation helpers. |
| No business logic in apps | Pass | Feature is core-only; no web or API implementation planned. |
| No framework imports in core | Pass | Plan excludes Express, Next.js, Mongoose, and MongoDB client imports in core. Generated script text may reference the MongoDB driver as runtime instructions, but core itself must not import it. |
| Connection strings remain transient | Pass | Core does not read or store connection strings; generated script comments instruct the user to provide `MONGODB_URI` at run time. |
| Tests for exported core behavior | Pass | Plan requires Jest coverage for the new exported function. |

## Project Structure

### Documentation (this feature)

```text
specs/011-export-js-seed-script/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- export-js-seed-script-core.md
`-- checklists/
    `-- requirements.md
```

### Source Code

```text
packages/types/src/
`-- generation.ts

packages/core/src/generation/
|-- export-js-seed-script.ts
|-- index.ts
`-- __tests__/
    `-- export-js-seed-script.test.ts
```

**Structure Decision**: Add a new generation use case in `packages/core/src/generation/`, matching existing pure use-case modules. Add or extend shared generation contracts in `packages/types/src/generation.ts` only if implementation needs public request/response types.

## Phase 0: Research

See [research.md](./research.md). Resolved decisions:

- CommonJS Node.js script using the MongoDB native driver and `MONGODB_URI`.
- Convert generated `_id` and ObjectId reference fields to `ObjectId(...)`.
- Insert-only script, with no cleanup/drop/delete behavior.
- Core returns script text and validation errors; it does not run the script or connect to MongoDB.

## Phase 1: Design & Contracts

Design artifacts:

- [data-model.md](./data-model.md)
- [contracts/export-js-seed-script-core.md](./contracts/export-js-seed-script-core.md)
- [quickstart.md](./quickstart.md)

## Implementation Approach

1. Add a core request/response contract for JavaScript seed script export.
2. Add a pure `exportJsSeedScript` core function that accepts a parsed schema, generated dataset, and optional collection counts.
3. Validate the dataset with `validateGeneratedDataset` before producing script output.
4. Treat any blocking validation error as export-blocking; give unresolved references a clear error category/message.
5. Use existing dependency order from the dataset or `buildGenerationPlan` to produce deterministic insert order.
6. Serialize records as readable JavaScript literals, converting `_id` and schema ObjectId reference fields to `ObjectId("...")`.
7. Include script comments explaining `MONGODB_URI`, `mongodb` package installation, and run intent.
8. Export the function from `packages/core/src/generation/index.ts`.
9. Cover valid export, dependency order, deterministic output, ObjectId conversion, setup comments, unresolved references, and non-reference validation failures with Jest tests.

## Complexity Tracking

No complexity violations.
