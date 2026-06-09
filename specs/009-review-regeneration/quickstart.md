# Quickstart: Reviewable Feedback Regeneration

## Prerequisites

- Node.js 20+
- npm 10+
- Dependencies installed with `npm install`
- Branch `009-review-regeneration`
- A signed-in user
- A project with reviewed schema and an accepted generated dataset
- Feature 008 feedback regeneration behavior available

## Manual Flow Verification

1. Start the API and web app using the existing README commands.
2. Sign in and open the generation workbench for a project with an accepted dataset.
3. Submit feedback such as `make users Canadian`.
4. Confirm regeneration uses the existing feedback flow and shows loading while in flight.
5. Confirm the returned dataset appears as a pending candidate, not as the accepted dataset.
6. Confirm the review area shows a difference view or concise summary:
   - changed collections
   - notable changed fields
   - preserved structure
   - fully applied, partially applied, or no meaningful changes
7. While the candidate is pending, try to submit another feedback request.
8. Confirm submission is blocked until the candidate is accepted or rejected.
9. Reject the candidate.
10. Confirm the previous accepted dataset remains active and later feedback uses it as baseline.
11. Submit feedback again and accept the candidate.
12. Confirm the accepted dataset updates only after acceptance.
13. Confirm later feedback uses the newly accepted dataset as baseline.
14. Submit feedback that causes duplicate unique values or invalid references.
15. Confirm one automatic retry occurs when the issue appears fixable.
16. If the retry remains invalid, confirm the UI asks for revised feedback and the accepted dataset remains unchanged.
17. Submit feedback that returns a valid candidate with non-blocking warnings.
18. Confirm the candidate can be accepted with warnings visible.
19. Submit feedback and leave the workbench while the candidate is pending.
20. Return to the workbench and confirm the pending candidate is gone and the accepted dataset remains.
21. Confirm export, direct seeding, rollback, and unrelated preview editing behavior remain unchanged.

## API Smoke Test

Use the existing endpoint:

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

- `200` with a candidate dataset and `candidateReview.state: "pending_review"` when the result is reviewable.
- `200` with `candidateReview.retryAttempt: 1` when the first invalid candidate was retried successfully.
- `200` with `candidateReview.state: "awaiting_revised_feedback"` when the retry still has blocking duplicate unique values or invalid references.
- Accepted dataset remains unchanged until the UI accept action is completed.

## Verification Command

```sh
npx.cmd turbo build lint test
```
