---
name: testseed-feature
description: Use when implementing a new TestSeed feature end to end across types, core, API, and web, or when changing a user-visible workflow.
---

# TestSeed Feature

Implement features layer by layer. Keep business behavior in core and keep the web app API-driven.

## Architecture Order

1. Add or update feature-owned shared types in `packages/types`.
2. Implement the use case in `packages/core`.
3. Add or update the API route in `apps/api`.
4. Add or update the API client method in `apps/web/src/lib/api-client.ts`.
5. Build reusable UI components and compose them into pages.
6. Write focused tests, starting with core behavior.

## CRUD Surface

Before implementation, decide which operations exist:

- create
- list/read
- update
- archive delete, when history should remain
- restore, when archived records can be recovered
- hard delete, only when explicitly requested

Document intentionally unsupported operations in `docs/architecture.md` or the feature plan.

## UI Guidance

- Keep pages thin; move repeated UI into components.
- Avoid long page files when a reusable component, hook, or helper would remove duplication.
- Keep components focused on rendering state and collecting user input.
- Route all server communication through `apps/web/src/lib/api-client.ts`.

## Guardrails

- Do not skip layers or combine responsibilities.
- Do not put business logic in `apps/`.
- Do not import `@testseed/core` or `@testseed/db` from `apps/web`.
- Do not store connection strings or secrets.
