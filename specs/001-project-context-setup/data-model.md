# Data Model: Project Context Setup

## Project

Existing project workspace owned by an authenticated user.

**Existing fields**:

- `id`
- `ownerId`
- `name`
- `description`
- `createdAt`
- `updatedAt`
- `archivedAt`
- `activeSchemaVersion`
- `activeSchemaSnapshotId`

**New/updated fields**:

- `context`: optional `ProjectContext`

**Relationships**:

- Owns zero or one active `ProjectContext`.
- Owns schema snapshots, history events, and seed batch records.

**Validation rules**:

- Only the owner may read or update context.
- Archived projects can display context, but updates should follow existing project lifecycle rules chosen during implementation.

## ProjectContext

Domain information used to make seed data relevant.

**Fields**:

- `description`: plain-language user description; optional but warned when empty.
- `repository`: optional `RepositoryContextSource`.
- `warnings`: `ContextWarning[]`.
- `updatedAt`: timestamp for the last context change.

**Validation rules**:

- Description must be trimmed.
- Empty description is allowed only with a warning.
- Description has a user-facing maximum length.
- Must not contain stored database connection strings or credential-like values.
- Removing repository context must remove repository-derived summary and warnings.

## RepositoryContextSource

Optional GitHub repository-derived context connected by the user.

**Fields**:

- `provider`: `"github"`.
- `repositoryFullName`: owner/name identity shown to the user.
- `repositoryUrl`: user-facing repository URL.
- `accessStatus`: `"connected" | "unauthorized" | "unavailable" | "too_large" | "no_useful_context"`.
- `summary`: generated context summary used by future seed generation.
- `contextCategories`: list of detected useful signals such as `schemas`, `models`, `seed_scripts`, `documentation`, and `domain_terms`.
- `warnings`: `ContextWarning[]`.
- `connectedAt`: timestamp when the summary was generated.

**Explicitly not stored**:

- GitHub access tokens.
- Raw repository file contents.
- Secrets or credential-like values found in files.
- Dependency folders, generated output, or binary file contents.

**State transitions**:

```text
not_connected -> connected
not_connected -> unavailable | unauthorized | too_large | no_useful_context
connected -> removed
connected -> unavailable | unauthorized | too_large | no_useful_context
```

## ContextWarning

User-facing warning about context quality, safety, or fallback.

**Fields**:

- `code`: stable warning identifier.
- `message`: user-facing explanation.
- `severity`: `"info" | "warning" | "error"`.

**Examples**:

- Empty description may produce generic data.
- Repository is outside connected account access.
- Repository did not contain useful schema/model/documentation files.
- Repository summary omitted secret-like or oversized files.
- Description and repository summary appear to describe different domains.

## ProjectEvent

Existing project history event.

**New event kinds to add**:

- `project_context_updated`
- `repository_context_connected`
- `repository_context_removed`

**Payload guidance**:

- May include context source status, repository full name, warning codes, and summary length.
- Must not include raw repository files, access tokens, or secrets.
