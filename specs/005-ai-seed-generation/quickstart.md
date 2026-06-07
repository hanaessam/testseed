# Quickstart: AI Seed Generation

## Prerequisites

- Node.js 20+
- npm 10+
- TestSeed dependencies installed with `npm install`
- `.env` includes a valid `OPENAI_API_KEY`
- User can register or log in
- Project context flow is available
- A reviewed schema has been saved for the project

## Demo Flow

1. Start the API and web apps.
2. Sign in.
3. Open or create a project.
4. Add project context that describes the application domain.
5. Provide a schema through manual schema input or MongoDB schema discovery.
6. Review and save the schema.
7. Set record counts for each reviewed collection.
8. Confirm the displayed total record count.
9. Generate seed records.
10. Verify that generated JSON is grouped by collection.
11. Verify that parent collections appear before child collections in the generation order.
12. Verify that every generated ObjectId reference points to an existing generated parent record.
13. Verify that generated values respect field types, enum values, required fields, and references.
14. Use the AI chat box to request a specific refinement, such as changing email domains, making product names more realistic, or adjusting generated statuses.
15. Verify that accepted chat refinements update the JSON while preserving schema validity and ObjectId references.
16. Verify that rejected chat refinements leave the current valid dataset unchanged and show clear validation feedback.
17. If validation fails, review collection and field-level messages and adjust schema review details, counts, or chat instructions.

## API Smoke Flow

```sh
POST /projects/:projectId/generations
```

Request body:

```json
{
  "collectionCounts": {
    "users": 3,
    "products": 5,
    "orders": 8
  }
}
```

Expected success:

- HTTP `201`
- `dataset.status` is `valid`
- `dataset.collections` is valid JSON grouped by collection
- `dataset.generationOrder` lists parent collections before child collections
- `dataset.validationResults` is empty or contains only non-blocking warnings

Refinement smoke request:

```sh
POST /projects/:projectId/generations/refinements
```

Request body:

```json
{
  "currentDataset": {
    "projectId": "project_123",
    "schemaSnapshotId": "snapshot_456",
    "status": "valid",
    "generationOrder": ["users", "products", "orders"],
    "collectionCounts": {
      "users": 3,
      "products": 5,
      "orders": 8
    },
    "collections": {}
  },
  "message": "Make the user emails use a university.edu domain."
}
```

Expected refinement success:

- HTTP `200`
- `mode` is `updated_dataset` or `guidance`
- Updated datasets keep `dataset.status` as `valid`
- Rejected refinements do not replace the current valid dataset

## Required Checks

Run before handoff:

```sh
npx turbo build lint test
```

## Expected Artifacts

- Generation request/response contracts in `packages/types`
- Core dependency planning, provider orchestration, retry, chat refinement, and validation use cases in `packages/core/src/generation`
- OpenAI-backed provider adapter plus authenticated generation and refinement routes in `apps/api`
- Record count controls, generated JSON display, and AI chat refinement box in `apps/web/app/generate/page.tsx`

## Safety Notes

- OpenAI API key stays server-side.
- Raw prompts, raw provider errors, connection strings, and credentials are not returned to users.
- Generated data is validated before it can be marked ready for downstream preview, export, insertion, or rollback workflows.
- Chat refinements are validated before replacing the current valid generated dataset.
