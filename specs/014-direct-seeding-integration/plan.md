# Implementation Plan: Direct Seeding Integration

**Feature Branch**: `017-direct-seeding-integration`

**Spec**: [spec.md](spec.md)

**Created**: 2026-06-23

---

## Summary

Wire together the direct seeding and rollback components built in specs 012 and 013 into a coherent, user-facing integration. All business logic is complete; this plan covers the integration layer: API endpoint exposure, UI connectivity, history surfacing, and end-to-end verification.

---

## Technical Context

| Property | Value |
|----------|-------|
| Language / Version | TypeScript strict, Node.js 20+ |
| Primary Dependencies | `@testseed/types` (existing contracts), `packages/core` (direct seeding + rollback use cases), `packages/db` (seed batch repository), `apps/api` routes, `apps/web` components |
| Storage | `seed_batches` collection (TestSeed DB); `project_events` collection; user target MongoDB (transient) |
| Testing | Jest in `packages/core`; TypeScript checks across all packages |
| Target Platform | Vercel (web + api); local Docker Compose |
| Project Type | Web application — Next.js frontend + Express API + MongoDB |
| Performance Goals | Seeding operations are user-initiated; no latency SLA beyond reasonable UI responsiveness |
| Constraints | Dependency direction must be preserved (web → api → core → db → types); no framework imports in core; connection strings remain transient — never stored, logged, or returned; export UI gated by `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT` |
| Scale / Scope | Integration wiring only — no new business logic; reuse core functions from specs 012 and 013 verbatim |

---

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Dependency direction preserved | PASS | All integration touches API routes and web components only; no core changes |
| No business logic in apps | PASS | Routes remain thin adapters; core already owns all decision logic |
| No framework imports in core | PASS | No core changes planned |
| Connection strings remain transient | PASS | Existing implementation already enforces this |
| Direct seeding gated by connection test | PASS | `connectionTestToken` requirement enforced in core |
| Dataset validation before mutation | PASS | `validateGeneratedDataset` called in core before any insert |
| Test-first core behavior | PASS | Core tests from 012/013 already cover all seeding and rollback paths |

---

## Project Structure

```
specs/014-direct-seeding-integration/
├── spec.md                          # Feature requirements (exists)
├── plan.md                          # This file
├── research.md                      # Design decisions
├── data-model.md                    # Integration data flow
├── quickstart.md                    # End-to-end validation guide
├── contracts/
│   └── direct-seeding-integration.md  # API surface contract
└── checklists/
    └── requirements.md              # Acceptance criteria checklist (exists)

Source files (already implemented — integration verification targets):
apps/api/src/routes/
├── generation.ts     # Direct seeding endpoints (test-connection, confirmation, execute)
├── rollback.ts       # Rollback and apply-seed-batch endpoints
└── history.ts        # Project history and seed batch list endpoints

apps/web/src/
├── components/generation/
│   ├── export-drawer.tsx          # 3-step direct seeding UI (connection → confirm → seed)
│   └── generation-workbench.tsx   # Hosts export drawer trigger
├── components/projects/
│   └── seed-batches-panel.tsx     # Seed batch list + rollback UI
└── lib/api-client.ts              # All API call functions for seeding and rollback

packages/core/src/generation/
└── direct-mongodb-seeding.ts      # testDirectMongoConnection, buildDirectSeedingConfirmation, seedMongoDataset

packages/core/src/projects/
└── rollback-seed-batch.ts         # rollbackSeedBatch
```

---

## Phase 0: Research

See [research.md](research.md) for design decisions and rationale.

All NEEDS CLARIFICATION items were resolved during exploration of the existing implementation:
- Core functions are complete (specs 012 + 013)
- API routes are complete and authenticated
- Web components exist and are connected
- Env gate controls export UI visibility

---

## Phase 1: Implementation Approach

Since all core logic and most integration wiring is already in place from specs 012/013, the implementation work for this spec is **verification and gap-closure**:

### Step 1 — Verify API endpoints are wired and authenticated
- `POST /projects/:projectId/direct-seeding/test-connection` in `apps/api/src/routes/generation.ts`
- `POST /projects/:projectId/direct-seeding/confirmation` in same file
- `POST /projects/:projectId/direct-seeding` (execute) in same file
- Confirm all three require JWT authentication middleware

### Step 2 — Verify direct seeding execute records seed batch in history
- After `seedMongoDataset` returns, route calls `POST /:projectId/seed-batches`
- Confirm `project_events` receives a `seed_batch_recorded` event
- Confirm `seed_batches` document contains: `seedBatchId`, `collectionCounts`, `targetDatabaseName`, `collectionOrder`, `status`

### Step 3 — Verify export drawer accessibility
- `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT=true` surfaces the export trigger in `generation-workbench.tsx`
- Export drawer opens to tabs: JSON, JavaScript seed script, Direct MongoDB Seed
- Direct MongoDB Seed tab shows the 3-step connection test → confirmation → execute flow

### Step 4 — Verify rollback endpoint is wired and authenticated
- `POST /projects/:projectId/rollback` in `apps/api/src/routes/rollback.ts`
- Confirm request requires `seedBatchId` and transient `mongoUri`
- Confirm response returns `deletedCounts`, updated `batch`, `event`

### Step 5 — Verify seed-batches-panel surfaces rollback-eligible batches
- `GET /projects/:projectId/history` returns seed batches
- `seed-batches-panel.tsx` displays batches with status
- Rollback-eligible batches (`inserted` or `partially_inserted`) show rollback action
- Already-rolled-back batches show the `rolled_back` status with no rollback action

### Step 6 — Verify project history tab shows seeding and rollback events
- `/projects/[projectId]` History tab queries `GET /:projectId/history`
- `seed_batch_recorded` events display: seedBatchId, targetDatabaseName, inserted counts
- `rollback_completed` events display: seedBatchId, deleted counts

### Step 7 — Security audit
- Confirm no connection string appears in `seed_batches` documents
- Confirm no connection string in `project_events` payloads
- Confirm API response bodies for all three seeding endpoints exclude `mongoUri`
- Confirm rollback response excludes `mongoUri`

### Step 8 — Verify partial insertion and partial rollback surface correctly
- `partially_inserted` seed batch status shown distinctly from `inserted`
- Partial rollback report: completed collections vs. failed collection shown separately
- UI renders partial states without implying full success

### Step 9 — End-to-end integration test (manual, disposable MongoDB)
- Follow the validation scenario in [quickstart.md](quickstart.md)

### Step 10 — Identify and close any remaining gaps
- If any step above reveals a missing wire-up, implement the minimal connecting code
- Follow existing patterns: thin route adapter → core delegation → structured response

### Step 11 — Run full gate
```sh
npx turbo build lint test
```

---

## Complexity Tracking

No novel architectural decisions required. All implementation patterns established in specs 012 and 013:
- Thin route adapters delegating to core
- Dependency-injected core functions
- Transient MongoDB connection closure in `finally`
- Structured partial-failure reports
- Sanitized error messages (no connection strings)
