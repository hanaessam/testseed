# ADR 0003: Immutable Dataset Versions

**Status**: Accepted  
**Date**: 2026-06-10

## Context

TestSeed users refine seed data iteratively — AI chat, feedback regeneration, manual cell edits, and accept/reject candidate flows. An earlier design **patched** the active saved dataset in place, which made it impossible to return to data from before a refinement within the same session.

Users need to:

1. See every refinement and edit as a retrievable snapshot.
2. Load any snapshot into the workbench.
3. Confirm and re-seed a chosen snapshot to MongoDB.

MongoDB **seed batch rollback** (`seedBatchId` deletion) solves a different problem: undoing what was inserted into the user's database, not browsing dataset history.

## Decision

1. **Immutable versions**: Every generation, pre-refine snapshot, refinement outcome, manual save, and accepted candidate creates a **new** `generated_dataset_records` document.
2. **Lineage**: Optional `parentDatasetId` and `versionLabel` on each version.
3. **Fork on PATCH**: `PATCH /generated-datasets/:id` calls `forkSavedGeneratedDataset` instead of updating in place; response includes `savedDatasetId` for the new version.
4. **Pre-refine snapshot**: Regenerate and refinement routes snapshot the current dataset as `Before refine: …` when `savedDatasetId` is provided.
5. **UI**: Workbench left rail shows **Dataset versions** with load + re-seed actions; seed batch history remains in the Export drawer.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Patch in place only | Loses history; cannot go back within same run |
| Seed-batch-centric “apply version” only | Conflates MongoDB state with dataset editing history |
| Separate version table | Duplicates dataset payload; fork on same collection is simpler |

## Consequences

- Storage grows with each refine/edit (acceptable for course/MVP scale).
- `activeSavedDatasetId` in the workbench changes when user saves or accepts a candidate.
- Chat-only guidance updates still patch `chatHistory` on the active version (no new data snapshot).
- Documentation and specs must distinguish **dataset versions** from **seed batches**.

## References

- `docs/dataset-version-history.md`
- `packages/core/src/generation/fork-saved-generated-dataset.ts`
