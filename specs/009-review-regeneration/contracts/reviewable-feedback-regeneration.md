# Contract: Reviewable Feedback Regeneration

This contract extends `specs/008-feedback-based-regeneration/contracts/feedback-regeneration-api.md`. It does not introduce a new endpoint.

## API Endpoint

`POST /projects/:projectId/generations/regenerate`

Authentication: Required.

## Request Delta

The request remains the existing 008 `FeedbackRegenerationRequest`.

Additional behavioral rule:

- If the workbench has a pending candidate, the client must not submit this request until the user accepts or rejects that candidate.

## Response Delta

The response remains `FeedbackRegenerationResponse`, extended with candidate review metadata where available.

```json
{
  "mode": "accepted",
  "message": "Applied requested address localization while preserving schema validity.",
  "dataset": {
    "projectId": "project_123",
    "schemaSnapshotId": "snapshot_456",
    "status": "valid",
    "generationOrder": ["users", "orders"],
    "collectionCounts": { "users": 5, "orders": 10 },
    "collections": {}
  },
  "candidateReview": {
    "state": "pending_review",
    "retryAttempt": 0,
    "changeSummary": {
      "status": "changed",
      "collectionsChanged": ["users"],
      "notableFieldsChanged": [
        { "collectionName": "users", "fieldName": "address", "count": 5 }
      ],
      "preservedCollections": ["orders"],
      "appliedFeedbackSummary": "Updated user addresses to Canadian examples.",
      "skippedFeedbackSummary": null,
      "noMeaningfulChanges": false
    }
  },
  "validationResults": [],
  "warnings": [],
  "chatHistory": []
}
```

## Response Rules

- `dataset` in the response is a candidate until the user accepts it in the workbench.
- The server must not persist a candidate as the accepted saved dataset before explicit acceptance.
- `candidateReview.state` is `pending_review` only when the candidate can be reviewed.
- `candidateReview.state` is `awaiting_revised_feedback` when one automatic retry still leaves blocking duplicate unique values or invalid references.
- Blocking validation results prevent acceptance even if candidate records are returned.
- `changeSummary.noMeaningfulChanges` is true when the candidate is effectively unchanged from the accepted dataset.

## Automatic Retry Rule

When the first candidate has duplicate unique values or invalid references that appear fixable:

1. Run one automatic retry using the same accepted dataset baseline and validation feedback from the invalid candidate.
2. Keep the accepted dataset active during retry.
3. If the retry succeeds, return the retried candidate with `retryAttempt: 1`.
4. If the retry still has blocking problems, return `candidateReview.state: "awaiting_revised_feedback"` and no acceptable candidate.

## Workbench UI Contract

### Pending Candidate

When the workbench receives a candidate:

- Show the candidate review state instead of replacing the accepted dataset immediately.
- Show a difference view or concise change summary.
- Keep export, direct seeding, rollback, and accepted-dataset preview actions governed by the accepted dataset.
- Disable feedback submission until the user accepts or rejects the candidate.

### Accept

When the user accepts a valid candidate:

- Candidate becomes the accepted dataset.
- Candidate chat history becomes accepted chat history.
- Pending candidate state is cleared.
- Later feedback uses the newly accepted dataset as baseline.

### Reject or Dismiss

When the user rejects or dismisses a candidate:

- Accepted dataset remains unchanged.
- Pending candidate state is cleared.
- Later feedback uses the previous accepted dataset as baseline.

### Leave Workbench

When the user leaves the workbench while a candidate is pending:

- Pending candidate is discarded.
- Accepted dataset remains unchanged.
- Candidate is not restored on return.

## Error and Status Expectations

| Situation | Expected behavior |
| --- | --- |
| Empty feedback | Existing 008 validation rejects submission. |
| Candidate has blocking duplicate unique values | Retry once if fixable, otherwise request revised feedback. |
| Candidate has invalid references | Retry once if fixable, otherwise request revised feedback. |
| Candidate has non-blocking warnings | Candidate may be reviewed and accepted with warnings visible. |
| New feedback submitted while pending candidate exists | Client blocks and prompts accept/reject first. |
| User leaves before accepting | Client discards candidate and preserves accepted dataset. |
| Provider/transport failure | Existing 008 failed/rejected handling remains; accepted dataset unchanged. |
