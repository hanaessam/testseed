# Quickstart: Direct Seeding Integration Validation

**Feature**: spec-014 Direct Seeding Integration

---

## Goal

Verify the end-to-end integration of direct MongoDB seeding and rollback through the full stack: API endpoints → core use cases → project history → web UI.

See [data-model.md](data-model.md) for request/response shapes and [contracts/direct-seeding-integration.md](contracts/direct-seeding-integration.md) for endpoint definitions.

---

## Prerequisites

- Node.js 20+, npm 10+
- Repo dependencies installed: `npm install`
- `.env` configured with `MONGODB_URI`, `JWT_SECRET`, `OPENAI_API_KEY`
- A disposable MongoDB instance (MongoDB Atlas free tier or local `mongod`) for insertion/rollback testing — **do not use a production database**
- A valid user account and JWT token (log in via `POST /auth/login`)
- A project with a generated dataset (run through the generation workbench first)

---

## Section A — API Connectivity Verification

Run these checks against the running API (`npm run dev` or deployed Vercel URL).

### A1. Enable the export feature gate
Set `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT=true` in `apps/web/.env.local` and restart.

### A2. Test connection
```http
POST /projects/:projectId/direct-seeding/test-connection
Authorization: Bearer <token>
Content-Type: application/json

{ "connectionString": "mongodb+srv://user:pass@cluster.mongodb.net/testdb" }
```
**Expected**: `{ "ok": true, "databaseName": "testdb", "connectionTestToken": "<token>", ... }`
**No connection string in response.**

### A3. Build confirmation
```http
POST /projects/:projectId/direct-seeding/confirmation
Authorization: Bearer <token>
Content-Type: application/json

{
  "connectionString": "mongodb+srv://...",
  "connectionTestToken": "<token from A2>",
  "schema": <parsedSchema>,
  "dataset": <generatedDataset>,
  "targetDatabaseName": "testdb"
}
```
**Expected**: `{ "targetDatabaseName": "testdb", "orderedCollections": [...], "totalRecordCount": N, "warning": "insertion is irreversible without rollback" }`

### A4. Execute direct seed
```http
POST /projects/:projectId/direct-seeding
Authorization: Bearer <token>
Content-Type: application/json

{
  "connectionString": "mongodb+srv://...",
  "connectionTestToken": "<token from A2>",
  "schema": <parsedSchema>,
  "dataset": <generatedDataset>,
  "targetDatabaseName": "testdb",
  "confirmed": true
}
```
**Expected**: Response includes `seedBatchId`, `successfulCollections` with counts, `report`.
**No connection string in response.**

### A5. Verify seed batch in history
```http
GET /projects/:projectId/history
Authorization: Bearer <token>
```
**Expected**:
- `events` array contains a `seed_batch_recorded` event with `seedBatchId` matching A4
- `seedBatches` array contains the batch with `status: "inserted"`, `targetDatabaseName`, `collectionCounts`
- No connection string in any field

### A6. Roll back the seed batch
```http
POST /projects/:projectId/rollback
Authorization: Bearer <token>
Content-Type: application/json

{
  "seedBatchId": "<seedBatchId from A4>",
  "mongoUri": "mongodb+srv://user:pass@cluster.mongodb.net/testdb"
}
```
**Expected**: `{ "deletedCounts": { ... }, "batch": { "status": "rolled_back", ... }, "event": { "kind": "rollback_completed", ... } }`
**No connection string in response.**

### A7. Verify rollback in history
Re-run `GET /projects/:projectId/history`.
**Expected**:
- `events` array now contains a `rollback_completed` event
- The seed batch entry shows `status: "rolled_back"` with `rolledBackAt` timestamp and `rollbackDeletedCounts`

### A8. Verify duplicate rollback is rejected
```http
POST /projects/:projectId/rollback
Authorization: Bearer <token>

{ "seedBatchId": "<same seedBatchId>", "mongoUri": "..." }
```
**Expected**: Error response with `ROLLBACK_BATCH_ALREADY_ROLLED_BACK` (HTTP 409). No records deleted.

---

## Section B — UI Walkthrough

With `NEXT_PUBLIC_GENERATION_WORKBENCH_EXPORT=true`:

1. Open the generation workbench for a project with generated data
2. Click the export trigger button → export drawer opens
3. In the drawer, navigate to the **Direct MongoDB Seed** tab
4. **Step 1 — Connection test**: Enter a disposable MongoDB connection string → click "Test Connection"
   - Expect: success message with database name; "Test Connection Token" field populated
5. **Step 2 — Confirm**: Click "Review Insertion" → confirmation panel shows database name, collection names, record counts, and an irreversible-warning message
6. **Step 3 — Execute**: Click "Seed Database" → insertion report shows seedBatchId and per-collection inserted counts
7. Navigate to the project detail page → **History** tab
   - Expect: seed batch entry visible with seedBatchId, status `inserted`, and collection counts
   - Expect: `seed_batch_recorded` event in the events list
8. In the seed batch entry, click the rollback action → confirmation dialog appears
9. Confirm rollback → deleted counts shown per collection; batch status updates to `rolled_back`
   - Expect: `rollback_completed` event now appears in the events list
10. Attempt rollback again on the same batch → expect: rollback action disabled or rejected

---

## Section C — Security Audit

Verify connection strings are absent from all persisted and returned data.

### C1. DB inspection (TestSeed MongoDB)
Using MongoDB Compass or `mongosh` on the TestSeed DB:
```js
// Check seed_batches collection
db.seed_batches.find({ "seedBatchId": "<seedBatchId from A4>" }).pretty()
// Confirm: no field named connectionString, mongoUri, password, or similar
// Confirm: collectionCounts, targetDatabaseName, status, collectionOrder are present

// Check project_events collection
db.project_events.find({ "payload.seedBatchId": "<seedBatchId>" }).pretty()
// Confirm: no connection string in payload
```

### C2. API response audit
Review all responses from A2–A7 above:
- `connectionString` must be absent from every response body
- `mongoUri` must be absent from every response body
- `password` or credential-like fields must be absent

### C3. Type-level verification
```sh
npm --workspace @testseed/types run build
npm --workspace @testseed/db run build
npm --workspace @testseed/api run build
```
`DirectMongoConnectionTestResult`, `DirectSeedingReport`, `RollbackSeedBatchResponse`, and `SeedBatch` must not declare a `connectionString` field.

---

## Final Gate

```sh
npx turbo build lint test
```

All packages must build, lint, and test cleanly before marking the integration complete.
