# TestSeed Agent Guide

## Project Identity

TestSeed generates realistic MongoDB seed data from Mongoose schemas or live database inspection. The system must keep sensitive database connection strings transient, validate AI output before use, and preserve a clean architecture that humans and AI agents can maintain.

Team: Hana, Mariam, Hassan, Mazen.

## Requirements Source

Full requirements, user stories, acceptance criteria, and alternative flows are in `docs/requirements.md`. Read this file before implementing any feature.

## Dependency Rule

The only allowed dependency direction is:

```text
packages/types -> packages/db -> packages/core -> apps/api -> apps/web
```

Interpret this as lower-level packages must never import higher-level packages:

- `packages/types` imports no `@testseed/*` package.
- `packages/db` may import `@testseed/types` only.
- `packages/core` may import `@testseed/types` only.
- `apps/api` may import `@testseed/types`, `@testseed/db`, and `@testseed/core`.
- `apps/web` may import `@testseed/types` only.
- No relative cross-package imports. Use `@testseed/*` workspace packages.

## SOLID in This Codebase

- Single Responsibility: each package owns one layer; each core folder owns one use case.
- Open/Closed: add new use cases, routes, and UI flows without modifying unrelated layers.
- Liskov Substitution: shared `@testseed/types` contracts must remain stable and substitutable across implementations.
- Interface Segregation: core functions receive only the dependency parameters they need, not broad service objects.
- Dependency Inversion: app and adapter layers pass external clients and credentials into core functions; core does not own infrastructure.

## Hard Rules

- No business logic in `apps/`.
- No module-level singletons in `packages/db`.
- No connection strings stored in code, logs, databases, config, or local files.
- No relative cross-package imports.
- No Express or Next.js imports in `packages/core`.
- No Mongoose imports in `packages/core`.
- No `@testseed/core` or `@testseed/db` imports in `apps/web`.

## Stack Versions

- Node.js 20+
- npm 10+
- TypeScript strict
- Next.js 14
- React 18
- Express 4
- Mongoose 8
- OpenAI API
- Zod 3
- NextAuth 4
- Turborepo 2

## Required Check

Run this before handing work back:

```sh
npx turbo build lint test
```

<!-- SPECKIT START -->
For the active Spec Kit feature, read:

- `specs/008-feedback-based-regeneration/spec.md`
- `specs/008-feedback-based-regeneration/plan.md`

**Shipped (reference only):** `specs/006-generation-workbench/`, `specs/005-ai-seed-generation/`

Roadmap: `docs/generation-ux-roadmap.md` · Requirements: `docs/requirements.md`

AI tooling inventory (MCPs, skills, Spec Kit, Superpowers): `docs/ai-assisted-tooling.md` — update when tooling changes.
<!-- SPECKIT END -->
