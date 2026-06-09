# Data Model: Reviewable Feedback Regeneration

Extends `specs/008-feedback-based-regeneration/data-model.md`. Existing entities and contracts remain authoritative unless explicitly extended here.

## Accepted Dataset

| Field | Type | Description |
| --- | --- | --- |
| `dataset` | `GeneratedDataset` | Current trusted dataset shown by the workbench and eligible for downstream actions under existing validity rules. |
| `savedDatasetId` | `string \| undefined` | Existing saved dataset identifier when the accepted dataset has been persisted. |
| `chatHistory` | `ChatRefinementMessage[]` | Accepted conversation history after accepted regeneration/refinement updates. |

### Rules

1. Accepted dataset remains canonical until a candidate is explicitly accepted.
2. Export, direct seeding, and rollback continue to read only accepted dataset state.
3. Rejected, invalid, or abandoned candidates never become regeneration baselines.

## Candidate Dataset

| Field | Type | Description |
| --- | --- | --- |
| `dataset` | `GeneratedDataset \| undefined` | Regenerated candidate records pending review. Missing when regeneration is rejected or cannot produce valid candidate records. |
| `mode` | `FeedbackRegenerationMode` | Existing outcome mode from 008: `accepted`, `partial`, `rejected`, or `cancelled`. |
| `message` | `string` | User-facing summary from regeneration. |
| `validationResults` | `GenerationValidationResult[]` | Blocking and non-blocking validation findings for the candidate. |
| `warnings` | `GenerationValidationResult[]` | Non-blocking warnings returned with the candidate. |
| `changeSummary` | `CandidateChangeSummary` | Deterministic comparison between accepted and candidate datasets. |
| `retryAttempt` | `number` | `0` for first attempt, `1` for the single automatic retry. |
| `createdAt` | `string` | Time candidate entered pending review state. |

### Rules

1. Candidate is pending review, not accepted output.
2. Candidate cannot be accepted while it has blocking validation errors.
3. Candidate is discarded on reject, dismiss, navigation away, or workbench exit.
4. Candidate is not persisted as a saved generated dataset until the user accepts it.

## Candidate Change Summary

| Field | Type | Description |
| --- | --- | --- |
| `status` | enum | `changed` \| `unchanged` \| `partial` \| `invalid` |
| `collectionsChanged` | `string[]` | Collections with added, removed, or modified records/fields. |
| `notableFieldsChanged` | `Array<{ collectionName: string; fieldName: string; count: number }>` | Field-level change counts for summary display. |
| `preservedCollections` | `string[]` | Collections that remain structurally unchanged. |
| `appliedFeedbackSummary` | `string` | Plain-language explanation of applied feedback. |
| `skippedFeedbackSummary` | `string \| undefined` | Plain-language explanation of feedback skipped to preserve constraints. |
| `noMeaningfulChanges` | `boolean` | True when candidate and accepted datasets are effectively unchanged. |

## Review State

| Field | Type | Description |
| --- | --- | --- |
| `pendingCandidate` | `CandidateDataset \| null` | Current candidate awaiting accept/reject decision. |
| `reviewStatus` | enum | `none` \| `pending_review` \| `accepted` \| `rejected` \| `invalid` \| `awaiting_revised_feedback` |
| `canSubmitFeedback` | `boolean` | False while a candidate is pending review or regeneration is in flight. |
| `canAcceptCandidate` | `boolean` | True only for a pending candidate without blocking validation errors. |
| `canRejectCandidate` | `boolean` | True when a pending candidate exists. |

## Retry Attempt

| Field | Type | Description |
| --- | --- | --- |
| `attempt` | number | `0` for the original regeneration attempt, `1` for the single automatic retry. |
| `reason` | enum | `duplicate_unique_value` \| `invalid_reference` |
| `validationFeedback` | `GenerationValidationResult[]` | Validation details used to guide the retry. |

### Rules

1. Retry is allowed once only.
2. Retry is limited to duplicate unique values or invalid references that appear fixable without changing user intent.
3. Accepted dataset remains unchanged during both the original attempt and retry.
4. If retry still has blocking problems, review state becomes `awaiting_revised_feedback`.

## State Transitions

```text
none -> pending_review (candidate returned without blocking errors)
none -> invalid (candidate returned with blocking errors and no retry available)
none -> awaiting_revised_feedback (retry still invalid)
pending_review -> accepted (user accepts valid candidate)
pending_review -> rejected (user rejects/dismisses candidate)
pending_review -> none (user leaves workbench; candidate discarded)
accepted -> none (accepted dataset becomes canonical; review complete)
rejected -> none (candidate discarded; accepted dataset preserved)
invalid -> awaiting_revised_feedback (user must revise feedback)
awaiting_revised_feedback -> none (user starts a new request after no pending candidate remains)
```

## Validation Rules

1. Candidate acceptance requires no blocking validation errors.
2. Duplicate unique values and invalid references block acceptance.
3. Missing required data, invalid types, and invalid enum values block acceptance.
4. Non-blocking warnings may be shown with the candidate and do not prevent acceptance.
5. A no-change candidate may be reviewed, but the summary must clearly state that no meaningful changes were made.
