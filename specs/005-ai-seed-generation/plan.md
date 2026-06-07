# Implementation Plan: AI Seed Generation

**Branch**: `005-ai-seed-generation`
**Spec**: `specs/005-ai-seed-generation/spec.md`
**Date**: 2026-06-07

## Summary

AI Seed Generation lets authenticated users generate realistic JSON records from a reviewed schema and selected per-collection counts. OpenAI API will be used as the generation provider, while TestSeed owns dependency ordering, ObjectId reference planning, schema-aware validation, retry/error handling, chat-based refinement, and response shaping. The required acceptance criteria are: parent collections are generated before child collections; generated values respect field types, enum values, required fields, and references; and the system returns valid JSON records grouped by collection. After generation, users can use an AI chat box to request targeted refinements or ask questions about the dataset; every mutating refinement is validated before replacing the current valid dataset.

## Technical Context

- TypeScript strict monorepo with Turborepo.
- Existing stack: React/Next.js web app, Express API, pure core package, shared `@testseed/types`, MongoDB/Mongoose persistence package, OpenAI API dependency in `apps/api`.
- OpenAI API is the seed generation provider. The API layer creates/passes the OpenAI client; core receives a small injected generator dependency and remains free of SDK imports.
- Existing reviewed schema contract is `ParsedSchema`, with `CollectionSchema` and `SchemaField` metadata for field type, required, unique, enum, reference, confidence, warnings, nested children, and array item type.
- Existing project snapshots provide the reviewed schema source for generation.
- Existing project events include `generation_requested` and `generation_completed`.
- Testing uses Jest for `packages/core` and TypeScript/Next lint/build checks across the repo.
- Target platform is the existing local and hosted web application.
- Performance target: demo-sized datasets should complete within 2 minutes for at least three related collections.
- Constraint: generated datasets accepted by TestSeed must be valid JSON grouped by collection and must not expose prompts, secrets, connection strings, or raw provider errors.
- Scope: initial AI generation plus chat-based dataset refinement. Manual record editing, export, direct insertion, and rollback remain downstream workflows.

## Constitution Check

- Dependency direction remains `packages/types -> packages/db -> packages/core -> apps/api -> apps/web`.
- `packages/core` will not import OpenAI SDK, Express, Next.js, or Mongoose.
- `apps/web` will import only `@testseed/types` from workspace packages and call the web API client.
- No business logic will be placed in `apps/`; API routes validate/authenticate and delegate to core.
- OpenAI prompt text, API key, credentials, MongoDB connection strings, and raw provider errors must not be returned to the user or stored in generated dataset responses.
- Chat history and refinement responses must remain sanitized and must not expose internal prompts, provider payloads, secrets, connection strings, or raw provider errors.
- Database connection strings remain unrelated to this feature and are not accepted by generation requests.

## Project Structure

### Documentation (this feature)

```text
specs/005-ai-seed-generation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ai-seed-generation-api.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/types/src/
├── api.ts
├── generation.ts
└── projects.ts

packages/core/src/generation/
├── __tests__/
├── build-generation-plan.ts
├── generate-seed-data.ts
├── refine-generated-dataset.ts
├── validate-generated-dataset.ts
└── index.ts

apps/api/src/routes/
├── __tests__/
└── generation.ts

apps/api/src/index.ts

apps/web/src/lib/api-client.ts

apps/web/app/generate/page.tsx
```

**Structure Decision**: Add a new `generation` feature area in shared types, core, and API while extending the existing Generate page with count controls, generated JSON display, validation feedback, and an AI chat refinement box. Keep OpenAI SDK construction in `apps/api`, and keep dependency ordering, refinement orchestration, and validation in `packages/core`.

## Implementation Phases

1. Shared generation contracts.
   - Add request/response types for generation counts, generated records, validation results, warnings, and generation status.
   - Add chat refinement request/response types for user instructions, chat history, mutation status, and validation results.
   - Re-export generation contracts from `packages/types/src/api.ts`.

2. Core generation planning and validation.
   - Build a collection dependency graph from reviewed references.
   - Sort parent collections before child collections.
   - Detect missing referenced collections, zero parent counts, and cycles.
   - Validate generated JSON grouped by collection against required fields, types, enum values, unique fields, nested fields, arrays, and references.

3. OpenAI-backed generation adapter.
   - Use OpenAI API as the provider through an injected API-layer adapter.
   - Request structured JSON records grouped by collection.
   - Include project context, reviewed schema, generation plan, and selected counts.
   - Retry malformed or schema-invalid output with validation feedback up to a bounded attempt limit.
   - Support refinement prompts that include the current generated dataset, reviewed schema constraints, validation context, and the user's chat instruction.
   - Allow non-mutating provider responses when the user asks for explanation or guidance rather than a dataset change.

4. API route.
   - Add an authenticated generation endpoint for a saved project schema.
   - Add an authenticated chat refinement endpoint for an existing generated dataset payload.
   - Validate counts and project access.
   - Load project details and active schema snapshot.
   - Delegate generation to core and return sanitized status/results/errors.
   - Preserve the current valid dataset when refinement fails validation.
   - Append project events for generation requested/completed.

5. Web flow.
   - Add per-collection count controls after schema review or saved schema load.
   - Show expected total record count and safe-count warnings.
   - Add generate action, loading state, success state, and validation error display.
   - Display generated JSON grouped by collection for initial review.
   - Add an AI chat box beside or below the generated JSON preview.
   - Show chat history, refinement progress, accepted updates, rejected changes, and non-mutating AI guidance.

## Risks

- AI output may be malformed or semantically invalid even when returned as JSON.
- Cyclic references may not have an obvious parent-first ordering.
- Low-confidence reviewed schema fields can lead to unrealistic or invalid records.
- Large requested counts may exceed practical generation limits or reduce data quality.
- Unique fields require explicit duplicate validation.
- Chat refinements can accidentally break references or schema constraints if not validated before applying.
- Ambiguous chat instructions may need a non-mutating clarification response rather than automatic data changes.

## Verification

Run:

```sh
npx turbo build lint test
```

Focused validation should include:

- Core tests for dependency ordering, reference integrity, required/type/enum validation, uniqueness, malformed output retry, and cycle/missing-reference handling.
- Core tests for chat refinement preserving the previous dataset on invalid refinement and accepting only validated updates.
- API contract checks for authenticated generation request/response shapes.
- API contract checks for authenticated chat refinement request/response shapes.
- Web lint/build checks for the Generate page count controls, generated JSON display, and AI chat refinement box.

## Complexity Tracking

No constitution violations are planned.
