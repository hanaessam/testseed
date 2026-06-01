# TestSeed Design

## Why Clean Architecture

TestSeed has user interface work, HTTP routing, AI prompting, MongoDB access, validation, export, insertion, and rollback. Clean architecture keeps those concerns separate so the team can change one part without dragging the rest of the system with it.

The most important boundary is between product behavior and frameworks. Generation rules, validation rules, regeneration logic, and rollback decisions belong in `@testseed/core` as use cases. Express, Next.js, Mongoose, and OpenAI client setup are adapters around those use cases. This makes the core easier to test and prevents framework choices from becoming business rules.

Clean architecture also helps AI agents. Agents can decide where a change belongs by reading the layer boundary instead of searching the whole repo. That lowers the chance of putting business logic into a route handler or importing database code into the UI.

## Why Monorepo Now, Polyrepo Later

The course project benefits from a monorepo because the team is small, the boundaries are still evolving, and changes often cross types, core logic, API routes, and UI screens. Turborepo gives one dependency graph, one install, one build command, and workspace imports that make architectural violations visible in review.

A polyrepo can make sense later if TestSeed grows into independently deployed services or if separate teams own the web app, API, data adapters, and shared packages. For now, a polyrepo would add release coordination, package publishing, and version drift before the product boundaries are stable.

Decision: keep a Turborepo monorepo now. Revisit polyrepo only after package APIs stabilize and deployment ownership becomes independent.

## Layer Responsibilities

| Layer | Path | Responsibility | May Import | Must Not Import |
| --- | --- | --- | --- | --- |
| Types | `packages/types` | Shared entities, DTOs, enums, and contracts | Nothing from `@testseed/*` | Runtime libraries, functions, classes |
| Data access | `packages/db` | Mongoose schemas, models, and connection factories | `@testseed/types`, `mongoose` | Core use cases, Express, Next.js |
| Core | `packages/core` | Use cases and business rules | `@testseed/types`, pure utilities, OpenAI SDK where needed | Express, Next.js, Mongoose, stored secrets |
| API | `apps/api` | Express routes, auth middleware, validation, adapter wiring | `@testseed/types`, `@testseed/db`, `@testseed/core` | UI code, inline business logic |
| Web | `apps/web` | Next.js UI, auth screens, API client, user workflows | `@testseed/types` | `@testseed/core`, `@testseed/db`, database clients |

## Package Responsibilities

### `@testseed/types`

Defines shared TypeScript interfaces, type aliases, enums, and DTO contracts. It has no runtime dependencies and no executable logic.

### `@testseed/db`

Owns Mongoose schemas, model definitions, and connection factories. It may create database adapters, but it must not decide product behavior.

### `@testseed/core`

Owns use cases: schema interpretation, seed generation orchestration, validation decisions, export shaping, direct seeding decisions, and rollback decisions. Core functions receive external dependencies as parameters.

### `@testseed/api`

Owns the HTTP interface. It validates requests with Zod, authenticates with JWT middleware, calls one core use case per route handler, and returns shaped responses.

### `@testseed/web`

Owns the Next.js user experience. It displays forms, previews, auth flows, feedback loops, export controls, and rollback screens. It calls the API through `src/lib/api-client.ts`.

## Web UI Direction

The web UI uses the dark terminal-precision system documented in [`docs/ui-design.md`](docs/ui-design.md). Future screens should reuse the same tokens, shadcn-style primitives, Geist typography, 240px sidebar app shell, and API-client-only data access rule.
