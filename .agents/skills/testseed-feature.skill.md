---
name: testseed-feature
description: Use when implementing any new TestSeed feature end to end
---

# TestSeed Feature

Follow the architecture order exactly:

1. Add or update feature-owned shared types in `packages/types` first. Do not put new feature contracts in `src/api.ts`; that file is only a compatibility barrel.
2. Implement the use case in `packages/core`.
3. Add an API route in `apps/api` that calls the core function.
4. Add an API client method in `apps/web/src/lib/api-client.ts`.
5. Build the UI component.
6. Write tests for the core function.

For each feature, declare its CRUD surface before implementation:

- create
- list/read
- update
- archive delete, when history should remain
- restore, when archived items can be recovered
- hard delete, when the user explicitly chooses destructive removal

If one operation is intentionally unsupported, document why in `docs/architecture.md` or the feature plan.

Never skip steps or combine layers. Do not put business logic in apps. Do not import `@testseed/core` or `@testseed/db` from `apps/web`.
