# Data Model: Generation Workbench

Client-side and API-facing structures for the workbench UI. Generation dataset shapes remain defined in `specs/005-ai-seed-generation/data-model.md`.

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
| `abortController` | AbortController \| null | Cancels in-flight refine/generate on navigation |

### State transitions

```text
idle → generating → complete | error
idle → streaming (refine) → validating → idle | error
generating → cancelled (navigate away) → idle
streaming → cancelled (navigate away) → idle (dataset unchanged)
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
```

## Saved Generated Dataset Run (persisted)

Stored in MongoDB `generated_dataset_records` when generation or refinement succeeds.

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Saved run identifier |
| `projectId` | string | Owning project |
| `schemaSnapshotId` | string | Schema version used |
| `source` | `generation` \| `refinement` | How the snapshot was created |
| `collectionCounts` | Record<string, number> | Counts used for this run |
| `collections` | Generated records by collection | Preview data |
| `generationOrder` | string[] | Dependency order |
| `chatHistory` | ChatRefinementMessage[] | User/assistant refinement transcript for this run |
| `createdAt` | ISO string | When the run was saved |

**Persistence rules:**

- **Generate** → new run with empty `chatHistory`.
- **Refinement (dataset updated)** → new run with full `chatHistory` from the refinement result.
- **Refinement (guidance/rejected)** → update `chatHistory` on the active `savedDatasetId` without a new data snapshot.

List summaries include `chatMessageCount` for the saved-runs panel.

## Out of scope for this data model

- Persisted workbench sessions across devices (only saved runs are persisted)
- Connection strings (never stored)
