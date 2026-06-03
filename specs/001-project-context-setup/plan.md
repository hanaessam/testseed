# Implementation Plan: Project Context Setup

**Branch**: `project-context` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-project-context-setup/spec.md`

## Summary

Implement project context as a first-class, project-owned workflow that saves a plain-language domain description and optional GitHub repository context summary before seed generation. The implementation follows TestSeed's existing clean architecture: shared contracts in `@testseed/types`, project context persistence in `@testseed/db`, business use cases in `@testseed/core`, Express routes in `apps/api`, and API-driven UI in `apps/web`.

GitHub repository context is part of this MVP feature, but it remains optional. The API will use a user-approved GitHub authorization flow for repositories accessible through the connected account, read only relevant repository signals, store only a generated summary and warnings, and discard raw file contents and access tokens after the context operation.

## Technical Context

**Language/Version**: TypeScript strict on Node.js 20+

**Primary Dependencies**: Turborepo 2, Express 4, Zod 3, Mongoose 8, Next.js 14, React 18, OpenAI SDK where repository summaries need AI assistance, existing GitHub OAuth integration patterns

**Storage**: TestSeed application MongoDB via `packages/db` Mongoose models and repositories; no raw repository file contents or GitHub access tokens stored

**Testing**: Jest for `packages/core`; TypeScript build checks for `packages/types`, `packages/db`, `apps/api`; Next lint/build for `apps/web`; repo handoff check `npx turbo build lint test`

**Target Platform**: Web app with Express API and Next.js frontend

**Project Type**: Turborepo web application with shared packages and API/UI apps

**Performance Goals**: Users can create or update description context and proceed in under 2 minutes; unavailable or unusable repository attempts return a clear fallback path; repository summarization should avoid reading irrelevant large files

**Constraints**: No business logic in `apps/`; `apps/web` imports only `@testseed/types`; API calls core use cases after Zod validation; core receives GitHub/OpenAI clients as injected dependencies; no connection strings, GitHub access tokens, or raw repository files are stored as project context

**Scale/Scope**: One authenticated user updates one project context at a time; repository context reads a bounded set of relevant project files and stores one summary plus warnings per project

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The checked-in constitution is still the default placeholder and does not define enforceable project principles. TestSeed's binding gates come from `AGENTS.md`, package `AGENTS.md` files, and `DESIGN.md`.

Pre-design gates:

- **Dependency direction**: PASS. Plan keeps `types -> db/core -> api -> web`; web remains API-only.
- **Business logic location**: PASS. Repository selection/summarization decisions belong in core use cases, not route handlers or UI components.
- **Secret handling**: PASS. GitHub access tokens are transient operation inputs; raw files and tokens are not persisted in project context.
- **DB singleton rule**: PASS. Persistence goes through existing connection factory and repositories.
- **Validation boundary**: PASS. API request bodies are validated with Zod before handlers call core.
- **Core framework isolation**: PASS. Core receives injected clients and does not import Express, Next.js, or Mongoose.

Post-design gates:

- **Dependency direction**: PASS. Contracts and artifacts preserve the same layer boundaries.
- **Business logic location**: PASS. Planned use cases own description updates, repository access policy, summary sanitization, and warning decisions.
- **Secret handling**: PASS. Data model stores summary/warnings only and explicitly excludes access tokens and raw repository files.
- **DB singleton rule**: PASS. DB work is limited to model/repository additions under `packages/db`.
- **Validation boundary**: PASS. API contracts include request validation requirements for project ID, description, repository selection, and removal operations.
- **Core framework isolation**: PASS. GitHub and AI clients are adapter dependencies passed into core use cases.

## Project Structure

### Documentation (this feature)

```text
specs/001-project-context-setup/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- project-context-api.md
|-- checklists/
|   `-- requirements.md
`-- tasks.md              # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
packages/types/src/
|-- projects.ts           # ProjectContext, RepositoryContextSource, warnings, requests/responses
`-- api.ts                # Re-export new API contracts

packages/db/src/
|-- models/project.ts     # Add context fields to project persistence shape
`-- repositories/project-repository.ts
    # Create/update/read/remove context repository methods

packages/core/src/projects/
|-- create-project.ts     # Accept initial context description
|-- update-project.ts     # Preserve/update description path
|-- update-project-context.ts
|-- connect-repository-context.ts
|-- remove-repository-context.ts
|-- get-project-detail.ts
`-- __tests__/project-context.test.ts

apps/api/src/routes/
|-- projects.ts           # Project context CRUD endpoints and repo-context OAuth start/callback
`-- auth.ts               # Keep identity login separate from repository-context authorization

apps/web/src/lib/
`-- api-client.ts         # Project context API client methods

apps/web/app/
|-- generate/page.tsx     # Context entry and repository context controls
`-- projects/[projectId]/page.tsx
    # Context review/status/remove actions

apps/web/components/
`-- project-context/      # Focused context form/status/repository controls
```

**Structure Decision**: Implement as an end-to-end TestSeed feature using the existing monorepo layers. Do not create a new package or service. GitHub repository reading is an API adapter concern; policy, filtering, summary shaping, and persistence decisions are core use cases.

## Complexity Tracking

No constitution violations are planned.
