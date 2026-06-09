# Research: Export JavaScript Seed Script

## Decision: Generate CommonJS Node.js With MongoDB Native Driver

**Rationale**: The clarified script format is CommonJS Node.js using the MongoDB native driver and `MONGODB_URI`. This keeps the generated script self-contained for local and CI usage without assuming the user's Mongoose models are available.

**Alternatives considered**:

- ESM script: viable, but less universally compatible with existing Node project defaults.
- Mongoose script: rejected because it would require user model files and app-specific paths.
- Framework-neutral snippet: rejected because the acceptance criteria require ready-to-run output.

## Decision: Convert ObjectId Fields to `ObjectId(...)`

**Rationale**: The generated dataset stores ObjectId values as strings, but a MongoDB seed script should insert ObjectId fields as actual ObjectId values when the reviewed schema identifies `_id` or reference fields. This preserves MongoDB reference semantics.

**Alternatives considered**:

- Leave ObjectIds as strings: rejected because ObjectId schema fields would be inserted as string values.
- Convert only `_id`: rejected because reference fields would still fail to match ObjectId field expectations.

## Decision: Produce Insert-Only Scripts

**Rationale**: Export should be portable and non-destructive. Cleanup, rollback, direct insertion, and destructive collection operations are separate product concerns. The generated script should not drop collections or delete records by default.

**Alternatives considered**:

- Delete matching generated IDs first: rejected because it mixes export with cleanup behavior.
- Clear target collections first: rejected as destructive and outside export scope.
- Include commented cleanup code: rejected for MVP because it could encourage unsafe manual edits.

## Decision: Reuse Existing Validation and Dependency Planning

**Rationale**: `validateGeneratedDataset` already identifies unresolved references and other blocking validation errors. `buildGenerationPlan` already models dependency ordering from the reviewed schema. Reusing these keeps script export aligned with generation and preview validation.

**Alternatives considered**:

- Implement export-specific validators: rejected as duplicate logic.
- Trust dataset status only: rejected because callers could pass stale or inconsistent validation state.

## Decision: Core Returns Script Text Only

**Rationale**: The core package must stay framework-free and infrastructure-free. It should not connect to MongoDB, read environment variables, import database clients, or execute generated scripts.

**Alternatives considered**:

- Execute inserts from core: rejected because direct seeding is a separate feature and core cannot own infrastructure.
- Add a web/API route now: rejected because the user explicitly scoped this feature to core logic.
