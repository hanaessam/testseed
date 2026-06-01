---
name: testseed-feature
description: Use when implementing any new TestSeed feature end to end
---

# TestSeed Feature

Follow the architecture order exactly:

1. Add or update shared types in `packages/types` first.
2. Implement the use case in `packages/core`.
3. Add an API route in `apps/api` that calls the core function.
4. Add an API client method in `apps/web/src/lib/api-client.ts`.
5. Build the UI component.
6. Write tests for the core function.

Never skip steps or combine layers. Do not put business logic in apps. Do not import `@testseed/core` or `@testseed/db` from `apps/web`.
