# Project History and Rollback Workflow

## Feature Goal

Schema parsing should not be a one-off stateless action. Each parsed schema needs to belong to a project, and every important action around that project should be preserved so the user can inspect history later and roll back seed transactions safely.

## Runtime Flow

1. The user authenticates and opens or creates a project.
2. The schema parser receives the pasted Mongoose schema text.
3. The backend saves the parsed schema snapshot to the active project.
4. The backend appends a history event for the parse action.
5. When the user adds chat feedback or regeneration notes, those messages are appended to the same project history stream.
6. When generated data is inserted, the batch metadata is stored as a rollback target.
7. When rollback is requested, the system uses the recorded batch and transaction history to delete only records that belong to that batch.

## Data Concepts

- `Project`: the owner-facing container for one schema/generation workspace.
- `ProjectSnapshot`: the saved parsed schema at a point in time.
- `ProjectEvent`: an append-only activity record for parse actions, chat messages, regeneration comments, generation runs, inserts, and rollbacks.
- `SeedBatch` or `Transaction`: the persisted insertion unit that powers rollback and reporting.

## Storage Rules

- Keep the latest project state easy to load.
- Keep history append-only so older actions remain inspectable.
- Store rollback metadata separately from the project document so batch lookup stays cheap.
- Do not store raw MongoDB connection strings anywhere persistent.

## API / Core / DB Boundary

- API routes validate the request and forward it to core.
- Core decides when a project should be created, updated, or appended to.
- DB models persist the project, event log, and transaction records.
- Shared types define the data contracts passed between layers.

## What Agents Should Look For

- A route that parses schemas but does not persist the result yet.
- A project-scoped persistence path that saves the parsed schema after a successful parse.
- A history log that records the user prompt, assistant response, and generation context.
- A batch record that links inserted documents to a single rollback identifier.
- A rollback path that only touches records that belong to the stored batch.
