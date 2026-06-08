# Data Model: Feedback-Based Regeneration

Extends data contracts from `specs/005-ai-seed-generation` and workbench session behavior from `specs/006-generation-workbench` and `specs/007-preview-editing`.

## Feedback Prompt

| Field | Type | Description |
| --- | --- | --- |
| `feedback` | string | User feedback text for iterative regeneration |

## Accepted Dataset Snapshot

| Field | Type | Description |
| --- | --- | --- |
| `dataset` | `GeneratedDataset` | Last accepted schema-valid dataset used as regeneration baseline |
| `schemaSnapshotId` | string | Schema version identifier used during regeneration |
| `collectionCounts` | `Record<string, number>` | Existing generation counts reused for context |

## Feedback Regeneration Request

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `acceptedDataset` | `GeneratedDataset` | yes | Last accepted dataset snapshot |
| `projectContext` | `string | null` | yes | Saved project description/context used for generation realism |
| `schemaContext` | `string` | yes | Serialized reviewed schema context used for constraints |
| `collectionCounts` | `Record<string, number>` | yes | Per-collection counts preserved from accepted baseline |
| `feedback` | `string` | yes | New feedback instruction |
| `chatHistory` | `ChatRefinementMessage[]` | no | Prior user-visible context for iteration continuity |

## Feedback Regeneration Outcome

| Field | Type | Description |
| --- | --- | --- |
| `mode` | enum | `accepted` \| `partial` \| `rejected` \| `cancelled` |
| `message` | string | User-facing summary |
| `dataset` | `GeneratedDataset \| null` | Present only when mode is `accepted` |
| `validationResults` | `GenerationValidationResult[]` | Constraint findings from validation gate |
| `warnings` | `GenerationValidationResult[]` | Non-blocking results returned with regeneration response |
| `chatHistory` | `ChatRefinementMessage[]` | Returned message history after processing the feedback |

## Workbench Regeneration Session State

| Field | Type | Description |
| --- | --- | --- |
| `status` | enum | `idle` \| `submitted` \| `in_progress` \| `accepted` \| `partial` \| `rejected` \| `cancelled` \| `failed` |
| `hasInFlightRequest` | boolean | True while a regeneration request is active |
| `submitEnabled` | boolean | False while `hasInFlightRequest` is true |
| `lastAcceptedDataset` | `GeneratedDataset` | Source-of-truth dataset for preview/export gates |
| `unsavedPreviewEdits` | `DatasetEditSession \| null` | Local edits that remain in preview only |
| `abortToken` | opaque | Request cancellation handle for navigation-away behavior |

## Validation and acceptance rules

1. Exactly one regeneration request can be in-flight per workbench session.
2. Regeneration input must include `projectContext`, `schemaContext`, `collectionCounts`, and `lastAcceptedDataset` (as `acceptedDataset`).
3. Unsaved preview edits are preserved locally and excluded from regeneration input.
4. Returned dataset must pass schema validation before replacing `lastAcceptedDataset`.
5. If validation fails, mode is `rejected` or `partial` and `lastAcceptedDataset` remains unchanged.
6. Navigating away cancels the in-flight request and outcome mode/status become `cancelled`.
7. Transport/provider failures transition UI status to `failed` while preserving `lastAcceptedDataset`.

## State transitions

```text
idle -> submitted (feedback submit initiated)
submitted -> in_progress (request accepted and running)
in_progress -> accepted (validated regenerated dataset returned)
in_progress -> partial (partially applied result without accepted dataset replacement)
in_progress -> rejected (validation failure or incompatible feedback)
in_progress -> cancelled (navigation away abort)
in_progress -> failed (transport/provider failure)
accepted|partial|rejected|cancelled|failed -> idle (user continues workflow)
```
