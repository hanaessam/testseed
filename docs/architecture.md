# TestSeed Architecture

TestSeed is organized as a clean-architecture monorepo. Dependencies point inward from UI and adapters toward stable contracts and use cases.

## Dependency Direction

Allowed package direction:

```text
packages/types -> packages/db -> packages/core -> apps/api -> apps/web
```

In practical terms:

- `packages/types` has no `@testseed/*` imports. It defines shared data contracts only.
- `packages/db` may import `@testseed/types`. It owns persistence models, cache adapters, and repository factories.
- `packages/core` may import `@testseed/types`. It owns business use cases and stays framework-free.
- `apps/api` may import `@testseed/types`, `@testseed/db`, and `@testseed/core`. It adapts HTTP requests to core use cases.
- `apps/web` may import `@testseed/types` only. It calls the API over HTTP and must not import backend packages.

## Directory Responsibilities

### `packages/types`

Shared TypeScript contracts used across the workspace.

- `src/auth.ts`: account, login, OTP, session, and user response contracts.
- `src/schema.ts`: parsed schema primitives plus schema parsing request/response contracts.
- `src/projects.ts`: project, schema snapshot, project event, seed batch, project CRUD, schema snapshot update/delete, history, and project-detail contracts.
- `src/api.ts`: compatibility re-exports only. New feature request/response contracts belong in their feature file, not in this mixed barrel.
- `src/index.ts`: public barrel export for consumers.

Feature contracts should be owned by the domain file that owns the vocabulary. When a feature exposes CRUD behavior, define the full surface up front or explicitly document unsupported operations. For projects, the supported lifecycle is create, list, read, update, archive delete, restore, and hard delete. For project schemas, the supported lifecycle is parse/create snapshot, read active snapshot, update active schema by saving a new snapshot, archive active snapshot, restore the latest archived snapshot, and hard delete active snapshot.

### `packages/core`

Framework-free application rules and use cases.

- `src/auth`: registration, login, GitHub login, logout, current user, password validation, and token creation.
- `src/schema`: manual schema parsing using local parsing first and AI fallback where configured.
- `src/projects`: project creation, project detail loading, schema snapshot persistence, project history, seed batch recording, and rollback orchestration.

Core should receive dependencies as parameters. It should not import Express, Next.js, Mongoose, Redis, or environment variables.

### `packages/db`

Persistence and cache adapters.

- `src/models`: Mongoose model factories. Models are created from an injected connection to avoid module-level database singletons.
- `src/repositories`: repository factories that convert Mongoose documents into shared `@testseed/types` contracts.
- `src/cache`: Redis-backed cache adapters such as pending registration OTP storage.
- `src/connection.ts`: Mongoose connection factory.

### `apps/api`

Express HTTP adapter layer.

- `src/index.ts`: app composition, environment loading, repository wiring, and route mounting.
- `src/middleware`: request authentication and request-body validation.
- `src/routes`: thin route adapters that validate input, call core use cases, and return JSON.
- `src/email`: email delivery adapter for OTP messages.

Routes should stay thin. If behavior is not about HTTP, validation, or adapter wiring, it belongs in `packages/core` or `packages/db`.

### `apps/web`

Next.js frontend.

- `app`: application routes and page-level views.
- `components`: reusable UI, auth, branding, and shell components.
- `src/lib/api-client.ts`: browser-side HTTP client for the API.
- `src/lib/session.ts`: local browser session storage and expiry handling.
- `src/lib/utils.ts`: UI utility helpers.

The web app should never import `@testseed/core` or `@testseed/db`; it should communicate with backend behavior through API endpoints.

### `docs`

Requirements, architecture notes, ADRs, and Superpowers planning artifacts.

- `docs/requirements.md`: source of product requirements.
- `docs/adr`: durable architecture decisions.
- `docs/superpowers`: implementation plans, specs, and workflow notes.
- `docs/ai-assisted-tooling.md`: living inventory of MCPs, skills, Spec Kit, and agent workflows (keep updated).

## Current Separation Notes

- Project history is split across shared contracts, db repositories, core use cases, API routes, and dashboard/project pages.
- Sensitive MongoDB connection strings are passed through request-time adapter code and are not persisted.
- Active project schema snapshots are stored separately from project metadata so project list loading stays lightweight.
- Archive deletes preserve project/history records through `archivedAt`; restore clears `archivedAt` and returns the item to active navigation; hard deletes remove project-owned records and must be explicit in the API/UI.
- The main shell includes a dedicated projects pane at `/projects`. Dashboard pages should summarize workspace state, while project lifecycle actions live on `/projects` and `/projects/[projectId]`.

## Testing Convention

Each feature keeps tests in a feature-owned `__tests__` directory:

- `packages/core/src/auth/__tests__`
- `packages/core/src/schema/__tests__`
- `packages/core/src/projects/__tests__`
- `packages/types/src/__tests__`
- `packages/db/src/repositories/__tests__`
- `apps/api/src/routes/__tests__`

Use `npm run test:suite` from the repository root to run the full build, lint, and test suite through Turbo. `npm test` runs every package-level `test` task, and every workspace package defines one so new failures are not skipped silently.

Core behavior tests use Jest. Type, db, API, and web tests currently use their package type/lint checks as contract tests until those layers need deeper behavioral test harnesses.
