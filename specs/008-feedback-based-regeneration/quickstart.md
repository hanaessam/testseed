# Quickstart: Feedback-Based Regeneration

## Prerequisites

- Node.js 20+
- npm 10+
- Dependencies installed with `npm install`
- Valid environment variables for API and auth
- Branch `008-feedback-based-regeneration`
- A project with reviewed schema and at least one accepted generated dataset

## Manual flow verification

1. Start app services.
2. Sign in and open generation workbench for a project with an accepted dataset.
3. Enter feedback message in the regeneration input (for example, `use Canadian addresses`).
4. Submit feedback.
5. Verify submit is disabled and loading state is visible while request is in progress.
6. Verify a second submission attempt is blocked during loading.
7. On success:
- Preview updates to the regenerated accepted dataset.
- Success message summarizes applied changes.
8. On partial/rejected outcome:
- Current accepted dataset remains unchanged.
- User sees clear message for skipped or rejected changes.
9. Make unsaved manual table edits, then submit feedback regeneration.
10. Verify unsaved manual edits remain in current preview while regeneration input still uses last accepted dataset.
11. Start another regeneration and navigate away before completion.
12. Verify request is canceled and returning to workbench shows last accepted dataset.
13. Confirm export/direct insert/rollback behavior is unchanged by this feature.

## API smoke test

```http
POST /projects/{projectId}/generations/regenerate
Authorization: Bearer {token}
Content-Type: application/json

{
  "acceptedDataset": { "...": "last accepted dataset snapshot" },
  "feedback": "Make user names more regionally diverse.",
  "projectContext": "B2C commerce platform for Canadian users.",
  "schemaContext": "users(8), orders(12)",
  "collectionCounts": { "users": 5, "orders": 10 },
  "chatHistory": []
}
```

Expected:
- `200` with `mode: "accepted"` and replacement dataset, or
- `200` with `mode: "partial"`/`"rejected"` and no dataset replacement payload

## Validation command

```sh
npx.cmd turbo build lint test
```
