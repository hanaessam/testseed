# Dataset Version History

**Status**: Shipped (implementation tracked in `docs/shipped-features.md`; architecture decision in `docs/adr/0003-immutable-dataset-versions.md`)

## Purpose

TestSeed keeps an **immutable version history** of generated datasets per project. Every generation, refinement, manual edit, and accepted regeneration candidate creates a new persisted snapshot. Users browse versions, load any snapshot into the workbench, and **re-seed** a chosen version to MongoDB after confirmation.

This is separate from **seed batch** metadata, which tracks what was inserted into the user's MongoDB database and supports `seedBatchId`-scoped deletion rollback.

## Mental model

| Concept | What it stores | User action |
| --- | --- | --- |
| **Dataset version** | Generated records, counts, chat history, labels | Load in workbench · Re-seed to MongoDB |
| **Seed batch** | MongoDB insertion run (`seedBatchId`, status, linked `savedDatasetId`) | View in Export drawer · Roll back inserted records |

**Going back to earlier data** → pick a dataset version.  
**Undoing a MongoDB insert** → roll back the seed batch (or re-seed a different version).

## When a new version is created

| Trigger | `source` | Typical `versionLabel` | `parentDatasetId` |
| --- | --- | --- | --- |
| Initial AI generation | `generation` | `Initial generation` | — |
| Before refine / feedback regeneration | `manual_edit` | `Before refine: {feedback}` | active version id |
| Chat refinement (dataset updated) | `refinement` | `Refined: {message}` | active version id |
| Feedback candidate accepted | `refinement` | `Accepted refinement` | active version id |
| Manual save / cell edits (PATCH) | `manual_edit` | `Manual edits` (or custom) | active version id |
| Save as new (POST) | `manual_edit` | `Manual edits` (or custom) | optional parent |

Versions are **never overwritten in place**. `PATCH /generated-datasets/:id` forks a new record via `forkSavedGeneratedDataset` in core.

Guidance-only refinements (no dataset change) still update `chatHistory` on the **active** version without creating a data snapshot.

## Persisted fields

MongoDB collection: `generated_dataset_records`

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Version identifier |
| `projectId` | string | Owning project |
| `schemaSnapshotId` | string | Schema snapshot used |
| `source` | `generation` \| `refinement` \| `manual_edit` | How the version was created |
| `versionLabel` | string? | Human-readable label in the UI |
| `parentDatasetId` | string? | Previous version this branched from |
| `collectionCounts` | Record<string, number> | Counts for this snapshot |
| `collections` | generated records | Full dataset payload |
| `generationOrder` | string[] | Dependency order |
| `chatHistory` | ChatRefinementMessage[] | Refinement transcript |
| `createdAt` | ISO string | Version timestamp |

## API

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/projects/:projectId/generated-datasets` | List version summaries (newest first) |
| `GET` | `/projects/:projectId/generated-datasets/:id` | Load full version |
| `POST` | `/projects/:projectId/generated-datasets` | Create version (`parentDatasetId`, `versionLabel` optional) |
| `PATCH` | `/projects/:projectId/generated-datasets/:id` | **Fork** new version; returns `{ dataset, savedDatasetId }` |
| `POST` | `/projects/:projectId/generations/refinements` | Snapshots before refine when `savedDatasetId` present |
| `POST` | `/projects/:projectId/generations/regenerate` | Snapshots before feedback regeneration when `savedDatasetId` present |
| `POST` | `/projects/:projectId/direct-seeding` | Accepts `savedDatasetId` to link seed batch to version |

Core use cases: `saveGeneratedDataset`, `forkSavedGeneratedDataset`, `listSavedGeneratedDatasets`, `getSavedGeneratedDataset`.

## UI (Generation Workbench)

**Location**: Left setup rail → **Dataset versions** panel (`saved-datasets-panel.tsx`).

- Click a row → load version in workbench (tables + agent dock chat).
- **Re-seed** → confirm dialog → direct seed that version to MongoDB.
- Re-seed requires a tested MongoDB connection (stored per project in `localStorage` after Export drawer connection test).

Export drawer (`export-drawer.tsx`) still handles JSON/JS export, connection test, direct seed of the **active** workbench dataset, and **seed runs** history (MongoDB batches).

Confirmation dialogs use shadcn `AlertDialog` via `useConfirmDialog()` — no `window.confirm()`.

## Re-seed flow

```text
User clicks Re-seed on version V
  → Confirm dialog (version label, supersede warning)
  → GET full dataset for V
  → Test stored connection string
  → buildDirectSeedConfirmation
  → executeDirectSeed (savedDatasetId: V)
  → Load V as active workbench version
```

Re-seeding upserts records and supersedes the prior active seed batch (see direct seeding + apply seed batch behavior).

## Security

- MongoDB connection strings remain **transient** (not stored server-side).
- Per-project connection string in browser `localStorage` is a UX convenience only; users can clear it by clearing site data.
- Version payloads may contain realistic fake data; access is scoped to project owner via auth.

## Related documentation

- `docs/requirements.md` — product epics and acceptance criteria
- `docs/ui-design.md` § Generate Flow
- `docs/generation-ux-roadmap.md` — workbench capabilities
- `specs/006-generation-workbench/data-model.md` — workbench + version model
- `specs/007-preview-editing/contracts/saved-dataset-patch-api.md` — fork PATCH contract
- `specs/012-direct-mongodb-seeding/data-model.md` — seed batches
- `specs/013-rollback-seed-batch/spec.md` — MongoDB batch rollback
- `docs/adr/0003-immutable-dataset-versions.md` — architecture decision

## Code map

| Layer | Path |
| --- | --- |
| Types | `packages/types/src/generation.ts` |
| DB model | `packages/db/src/models/generated-dataset-record.ts` |
| Repository | `packages/db/src/repositories/generated-dataset-repository.ts` |
| Core fork | `packages/core/src/generation/fork-saved-generated-dataset.ts` |
| Core save | `packages/core/src/generation/save-generated-dataset.ts` |
| API routes | `apps/api/src/routes/generation.ts` |
| Versions panel | `apps/web/components/generation/saved-datasets-panel.tsx` |
| Workbench wiring | `apps/web/app/generate/page.tsx` |
