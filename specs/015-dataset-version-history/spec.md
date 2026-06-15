# Feature Specification: Dataset Version History

**Created**: 2026-06-10  
**Status**: Planned  
**Canonical doc**: [`docs/dataset-version-history.md`](../../docs/dataset-version-history.md)  
**ADR**: [`docs/adr/0003-immutable-dataset-versions.md`](../../docs/adr/0003-immutable-dataset-versions.md)

## Summary

Immutable **dataset versions** let users browse every generate/refine/edit snapshot, load any version in the workbench, and **re-seed** a chosen version to MongoDB after confirmation. Versions are stored in `generated_dataset_records` with optional `versionLabel` and `parentDatasetId`.

This feature is distinct from **seed batch rollback** (`specs/013-rollback-seed-batch`), which deletes MongoDB records by `seedBatchId`.

## User stories (shipped)

1. As a developer, every refinement and save creates a retrievable version, including a **Before refine** snapshot.
2. As a developer, I can load any prior version into the workbench without losing other versions.
3. As a developer, I can confirm and **re-seed** any version to MongoDB.

## Implementation map

| Layer | Artifact |
| --- | --- |
| Types | `SavedGeneratedDataset`, `SavedGeneratedDatasetSummary` + version fields |
| DB | `generated-dataset-record` model |
| Core | `forkSavedGeneratedDataset`, `saveGeneratedDataset` |
| API | `generation.ts` — PATCH fork, pre-refine snapshot |
| Web | `saved-datasets-panel.tsx`, `generate/page.tsx` re-seed handler |

## Related specs

- `006-generation-workbench` — versions panel in workbench
- `007-preview-editing` — fork-on-save
- `008-feedback-based-regeneration` — pre-refine snapshot on regenerate
- `012-direct-mongodb-seeding` — `savedDatasetId` on seed batches
