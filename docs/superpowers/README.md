# Superpowers Docs

This folder is the agent-facing documentation layer for TestSeed.

## What lives here

- `plans/` contains implementation plans written as task-by-task execution guides.
- `workflows/` contains feature-level operating notes that explain how the app is expected to behave.
- `specs/` can hold design documents when a feature needs a more formal architecture description.

## How agents should use these files

1. Read the workflow note for the feature first.
2. Read the matching implementation plan second.
3. Follow the file boundaries and test targets exactly.
4. Keep user-facing behavior aligned with the requirements in `docs/requirements.md`.

## Current feature slice

The current documentation slice covers project-aware schema parsing, persistent project history, transaction tracking, and rollback support.

For that feature, start with:

- `docs/superpowers/workflows/project-history-and-rollback.md`
- `docs/superpowers/plans/2026-06-02-project-history-and-rollback.md`

The dashboard/session slice covers signed-in account info, visible projects and history, and session persistence in local storage.

For that feature, start with:

- `docs/superpowers/workflows/dashboard-project-history-session.md`
- `docs/superpowers/specs/2026-06-02-dashboard-project-history-session-design.md`
