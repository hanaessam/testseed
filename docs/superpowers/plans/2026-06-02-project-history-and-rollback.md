# Project History and Rollback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist each parsed schema inside a project record, keep an append-only history of chats and transactions for that project, and store rollback-ready seed batch metadata for later recovery.

**Architecture:** The feature should stay cleanly layered. Shared types define the contracts, `packages/db` owns the Mongoose persistence models and repositories, `packages/core` owns the project/history use cases, and `apps/api` only validates requests and calls core. The current schema parser remains the entry point, but instead of returning a stateless parse result it should also attach the parsed snapshot to a project and append a history event.

**Tech Stack:** TypeScript, Jest, Express, Zod, MongoDB/Mongoose, Next.js API adapter layer, JWT-authenticated requests.

---

### Task 1: Add shared project-history contracts

**Files:**
- Modify: `packages/types/src/index.ts`
- Test: `packages/types` build/typecheck through the workspace test run

- [ ] **Step 1: Define the new contracts**

Add the following public types alongside the existing schema and auth types:

```ts
export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  activeSchemaVersion: number;
  activeSchemaSnapshotId?: string;
}

export interface ProjectSchemaSnapshot {
  id: string;
  projectId: string;
  version: number;
  schema: ParsedSchema;
  source: "manual" | "mongodb" | "ai";
  createdAt: Date;
}

export type ProjectEventKind =
  | "project_created"
  | "schema_parsed"
  | "chat_message"
  | "generation_requested"
  | "generation_completed"
  | "seed_batch_recorded"
  | "rollback_requested"
  | "rollback_completed";

export interface ProjectEvent {
  id: string;
  projectId: string;
  actorId: string;
  kind: ProjectEventKind;
  message: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

export interface SeedBatch {
  id: string;
  projectId: string;
  actorId: string;
  seedBatchId: string;
  collectionCounts: Record<string, number>;
  insertedDocumentIds: Record<string, string[]>;
  status: "pending" | "inserted" | "partially_inserted" | "rolled_back";
  createdAt: Date;
  rolledBackAt?: Date;
}
```

- [ ] **Step 2: Extend schema parse payloads**

Update `ParseSchemaRequest` and `ParseSchemaResponse` only if the plan keeps the parser response shape stable. If extra project metadata is needed, add a separate response wrapper instead of breaking existing parser callers.

- [ ] **Step 3: Keep the contracts serializable**

Avoid adding non-JSON values to the event payload shape. Every payload must survive a `JSON.stringify` / `JSON.parse` round trip.

### Task 2: Add persistence models and repositories

**Files:**
- Create: `packages/db/src/models/project.ts`
- Create: `packages/db/src/models/project-snapshot.ts`
- Create: `packages/db/src/models/project-event.ts`
- Create: `packages/db/src/models/seed-batch.ts`
- Create: `packages/db/src/repositories/project-repository.ts`
- Create: `packages/db/src/repositories/project-history-repository.ts`
- Modify: `packages/db/src/index.ts`
- Test: `packages/db/src/repositories/*.test.ts` if repository tests are added for the new slice

- [ ] **Step 1: Model the project root document**

Store the current project metadata and pointer to the active schema snapshot. Keep the document small so loading the active project stays cheap.

- [ ] **Step 2: Model immutable schema snapshots**

Persist each parsed schema version separately instead of overwriting the old one. Link the snapshot back to the project and store the version number so later history views can show which parse generated which snapshot.

- [ ] **Step 3: Model append-only project events**

Store every chat, parse, generation, and rollback activity as an event document. This gives you the history feed without embedding an unbounded array inside the project root.

- [ ] **Step 4: Model seed batches for rollback**

Persist `seedBatchId`, inserted document ids, collection counts, and rollback state in a dedicated collection. Rollback should read from this record, not from the project root.

- [ ] **Step 5: Export repository factories**

Add repository factories that accept a Mongoose connection and return small methods such as `createProject`, `findProjectById`, `saveSchemaSnapshot`, `appendProjectEvent`, `recordSeedBatch`, and `markSeedBatchRolledBack`.

- [ ] **Step 6: Wire the new repositories through the package index**

Update the package barrel so `apps/api` and `packages/core` can import the new repository factories without reaching into file paths directly.

### Task 3: Add core project and history use cases

**Files:**
- Create: `packages/core/src/projects/create-project.ts`
- Create: `packages/core/src/projects/save-parsed-schema.ts`
- Create: `packages/core/src/projects/append-project-event.ts`
- Create: `packages/core/src/projects/list-project-history.ts`
- Create: `packages/core/src/projects/record-seed-batch.ts`
- Create: `packages/core/src/projects/rollback-seed-batch.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/projects/*.test.ts`

- [ ] **Step 1: Write tests that pin the behavior**

Cover these cases first:

```ts
it("creates a project for the authenticated user")
it("saves a parsed schema snapshot and bumps the active version")
it("appends a parse event after saving the snapshot")
it("returns project history in chronological order")
it("records a seed batch for rollback")
it("marks a seed batch as rolled back without touching other projects")
```

- [ ] **Step 2: Implement project creation and schema persistence**

Make the core layer accept `ownerId`, project metadata, and parsed schema input. Core should call the repository methods in the order needed to keep the project root, snapshot, and event log consistent.

- [ ] **Step 3: Implement history/event appenders**

Add a helper that records the event kind, a human-readable message, and a JSON-safe payload. Keep the helper framework-free.

- [ ] **Step 4: Implement rollback batch recording**

Persist the batch id, inserted ids, and collection counts immediately after insertion succeeds. If only some collections insert successfully, the batch status should reflect the partial state.

- [ ] **Step 5: Implement rollback execution**

Rollback should load the batch, delete only the recorded ids from the target database, update the batch status, and append a rollback event.

### Task 4: Thread the flow through the API adapter

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/routes/schema.ts`
- Create: `apps/api/src/routes/projects.ts`
- Create: `apps/api/src/routes/history.ts`
- Create: `apps/api/src/routes/rollback.ts`
- Modify: `apps/api/src/middleware/auth.ts`
- Modify: `apps/api/src/middleware/validate.ts` if request shapes need tighter parsing

- [ ] **Step 1: Add authenticated user identity to the request pipeline**

The current auth middleware only verifies the token. Extend it so downstream handlers can read the authenticated user id from the request context after verification.

- [ ] **Step 2: Create project-scoped routes**

Add routes for creating a project, reading project history, and saving a parsed schema to the current project. Keep the handlers thin: validate the body, call core, return JSON.

- [ ] **Step 3: Update the schema parse route**

The schema parse endpoint should remain responsible for parsing, but once parsing succeeds it should also call the project persistence use case so the parsed schema is tied to the project.

- [ ] **Step 4: Add rollback endpoints**

Expose endpoints that list seed batches, fetch a batch by id, and request rollback by `seedBatchId`.

### Task 5: Update parser integration and history events

**Files:**
- Modify: `packages/core/src/schema/parser.ts`
- Modify: `packages/core/src/schema/parser.test.ts`
- Modify: `apps/api/src/routes/schema.ts`

- [ ] **Step 1: Keep parsing behavior stable**

Do not break the current parser contract for callers that only need schema extraction. The parser should still be able to return the parsed schema and warnings.

- [ ] **Step 2: Attach persistence as a separate use case**

Move project persistence out of the parser itself and into the project use case layer. The parser remains a pure parser; the adapter composes parsing with persistence.

- [ ] **Step 3: Record parse events from the adapter path**

When the API successfully saves a parsed schema to a project, append the corresponding history event in the same request flow.

### Task 6: Add focused tests and workspace validation

**Files:**
- Modify or create tests in the files above
- Validate with workspace commands

- [ ] **Step 1: Run the narrow package tests first**

Run the package tests that cover the touched slice before widening to the whole workspace.

```bash
npm test -- --runInBand packages/core/src/projects
npm test -- --runInBand packages/db/src/repositories
```

- [ ] **Step 2: Run the workspace validation command**

After the new slice is green, run the repository-required check.

```bash
npx turbo build lint test
```

- [ ] **Step 3: Fix only the touched slice if validation fails**

If a validation failure comes from this feature, repair the same slice before widening scope.

### Task 7: Update the feature docs after implementation

**Files:**
- Modify: `docs/superpowers/workflows/project-history-and-rollback.md`
- Modify: `docs/requirements.md` only if the accepted behavior changes in a user-visible way

- [ ] **Step 1: Capture the actual implemented flow**

After code lands, update the workflow note to match the exact request/response shape and the final model names.

- [ ] **Step 2: Keep the docs synchronized with the code**

If the implemented model names differ from the plan, update the workflow document rather than leaving stale names behind.
