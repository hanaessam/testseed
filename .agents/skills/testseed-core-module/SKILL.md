---
name: testseed-core-module
description: Use when adding or changing TestSeed business use cases in packages/core, including pure logic, dependency-injected services, and core tests.
---

# TestSeed Core Module

Core owns business behavior. It must stay framework-free, database-free, and easy to test.

## Workflow

1. Read root `AGENTS.md`, `packages/core/AGENTS.md`, and `docs/requirements.md`.
2. Identify the smallest use case and the exact dependencies it needs.
3. Write or update the Jest test first.
4. Create or update a focused folder under `packages/core/src/`.
5. Export one main async function per use case file/folder.
6. Pass repositories, clients, credentials, and callbacks as function parameters.
7. Export the use case from the feature `index.ts` and `packages/core/src/index.ts`.

## Guardrails

- Do not import Express, Next.js, Mongoose, route handlers, UI code, or database connection singletons.
- Do not read environment variables in core.
- Do not store database connection strings or secrets.
- Keep function dependency objects narrow; receive only what the use case calls.
- Prefer stable contracts from `@testseed/types`.
