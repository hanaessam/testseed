# Data Model: Generation Workbench

Client-side and API-facing structures for the workbench UI. Generation dataset shapes remain defined in `specs/005-ai-seed-generation/data-model.md`.

**Dataset version persistence** is documented in `docs/dataset-version-history.md`.

## Generation Workbench Session

Ephemeral UI state for one active project on `/generate`.

| Field | Type | Description |
| --- | --- | --- |
| `projectId` | string | Active project |
| `projectContext` | object | Description + optional repository summary from project detail |
| `schemaSnapshot` | object \| null | Active reviewed snapshot metadata + parsed schema |
| `collectionCounts` | Record<string, number> | Per-collection requested counts |
| `plan` | GenerationPlanView \| null | Latest plan from plan API |
| `planRiskAcknowledged` | boolean | User saw soft-warn for blocking plan issues |
| `dataset` | GeneratedDataset \| null | Last valid generated dataset |
| `validationResults` | ValidationResult[] | Latest validation messages for badges |
| `chatHistory` | ChatMessage[] | User/assistant transcript in agent dock |
| `refinementStatus` | enum | `idle` \| `streaming` \| `validating` \| `error` |
| `generationStatus` | enum | `idle` \| `generating` \| `complete` \| `error` |
| `generationProgress` | CollectionProgress[] | Phase 2a per-collection stream state |
| `setupRailExpanded` | boolean | Collapsed by default for returning users |
| `activeCollectionTab` | string | Selected collection in data canvas |
| `activeSavedDatasetId` | string \| null | Active **dataset version** id in workbench |
| `abortController` | AbortController \| null | Cancels in-flight refine/generate on navigation |

### State transitions

```text
idle → generating → complete | error
idle → streaming (refine) → validating → idle | error
generating → cancelled (navigate away) → idle
streaming → cancelled (navigate away) → idle (dataset unchanged)
save/accept → fork new version → activeSavedDatasetId updated
```

## Generation Plan View

Read-only projection of core `CollectionGenerationPlan` + dependency graph.

| Field | Type | Description |
| --- | --- | --- |
| `orderedCollections` | string[] | Parent-before-child order |
| `items` | PlanItem[] | Per-collection counts, refs, warnings |
| `totalRecords` | number | Sum of collection counts |
| `blockingWarnings` | Warning[] | Cycles, missing refs, zero-parent issues |
| `riskLevel` | `none` \| `elevated` | `elevated` when blocking warnings present |

**Validation (UI)**:

- Soft warn when `riskLevel === elevated`; Generate remains enabled (FR-004a).

## Collection Progress (Phase 2a)

| Field | Type | Description |
| --- | --- | --- |
| `collectionName` | string | Collection identifier |
| `status` | `pending` \| `in_progress` \| `complete` \| `failed` | Stream progress |
| `recordCount` | number | Expected count from plan |
| `rowsReceived` | number | Rows rendered so far |

## Context Sources View

| Field | Type | Description |
| --- | --- | --- |
| `hasDescription` | boolean | Project description non-empty |
| `descriptionPreview` | string | Truncated description for rail |
| `hasRepository` | boolean | GitHub repo connected with summary |
| `repositoryLabel` | string | e.g. `owner/repo` |
| `genericWarning` | boolean | True when both sources empty |

## Collection Table View

Projection of one collection's records for the data canvas.

| Field | Type | Description |
| --- | --- | --- |
| `collectionName` | string | Tab identifier |
| `columns` | ColumnDef[] | From reviewed schema field names/types |
| `rows` | Record<string, unknown>[] | Paginated slice of records |
| `pagination` | `{ page, pageSize, total }` | Client pagination |
| `cellValidation` | Map<rowId, FieldValidation[]> | Phase 2b badges |

## Agent Dock Message

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Client-generated id |
| `role` | `user` \| `assistant` \| `system` | Chat role |
| `content` | string | Full or partial (streaming) text |
| `status` | `complete` \| `streaming` \| `error` | Render state |
| `createdAt` | ISO string | Display ordering |

## Relationships

```text
Project 1──1 Workbench Session (per browser tab)
Workbench Session 1──1 Generation Plan View (refreshed on counts change)
Workbench Session 1──1 Generated Dataset (last valid)
Workbench Session 1──* Agent Dock Message
Workbench Session 1──* Collection Progress (Phase 2a)
Workbench Session *──* Saved Generated Dataset Version (load/fork)
```

## Saved Generated Dataset Version (persisted)

Stored in MongoDB `generated_dataset_records`. **Immutable** — updates fork new documents.

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Version identifier |
| `projectId` | string | Owning project |
| `schemaSnapshotId` | string | Schema version used |
| `source` | `generation` \| `refinement` \| `manual_edit` | How the version was created |
| `versionLabel` | string? | UI label (e.g. `Before refine: …`, `Manual edits`) |
| `parentDatasetId` | string? | Prior version this branched from |
| `collectionCounts` | Record<string, number> | Counts for this version |
| `collections` | Generated records by collection | Preview data |
| `generationOrder` | string[] | Dependency order |
| `validationResults` | ValidationResult[] | Stored validation state |
| `warnings` | ValidationResult[] | Non-blocking warnings |
| `chatHistory` | ChatRefinementMessage[] | Refinement transcript |
| `createdAt` | ISO string | When the version was saved |

**Persistence rules (shipped):**

- **Generate** → new version, label `Initial generation`, empty `chatHistory`.
- **Before refine/regenerate** → snapshot current dataset as `Before refine: {feedback}` with `parentDatasetId` = active version (when `savedDatasetId` provided).
- **Refinement (dataset updated)** → new version `Refined: {message}` with full `chatHistory`.
- **Accept candidate** → fork `Accepted refinement` via PATCH.
- **Manual save** → fork via PATCH or POST with `Manual edits`.
- **Refinement (guidance/rejected)** → update `chatHistory` on active version only; no new data snapshot.

List summaries include `chatMessageCount`, `versionLabel`, and `parentDatasetId` for the versions panel.

## Out of scope for this data model

- Ephemeral workbench sessions across devices (only dataset versions are persisted)
- Connection strings (never stored server-side)
- Seed batch documents (see `specs/012-direct-mongodb-seeding/data-model.md`)
