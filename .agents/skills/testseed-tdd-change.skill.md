---
name: testseed-tdd-change
description: Use when implementing any TestSeed code, behavior, route, setup, or documentation change that should be developed with test-driven development and kept runnable from README instructions
---

# TestSeed TDD Change

Use this workflow for every implementation change:

1. Read `docs/requirements.md` and the relevant `AGENTS.md` files before editing.
2. Identify the smallest behavior change and the package layer that owns it.
3. Write or update the failing test first.
4. Implement only enough code to pass the test.
5. Refactor only within the touched scope.
6. Update `README.md` whenever the change affects setup, environment variables, scripts, ports, build steps, run steps, or user-visible workflows.
7. Preserve the dependency rule:
   `packages/types -> packages/db -> packages/core -> apps/api -> apps/web`.
8. Keep business logic out of `apps/`; route handlers should validate, call core, and shape HTTP responses.
9. Never store database connection strings or OAuth secrets in code, logs, databases, docs with real values, or local files.
10. Run `npx turbo build lint test` before handing work back.

For GitHub account or repository access changes:

1. Keep OAuth HTTP exchange details in `apps/api`.
2. Put account resolution behavior in `packages/core`.
3. Keep user persistence in `packages/db`.
4. Expose only shared request/response contracts through `packages/types`.
5. Start auth from `apps/web/src/lib/api-client.ts`; do not import `@testseed/core` or `@testseed/db` in `apps/web`.
6. Treat repository file access as separate from login. Add explicit tests for scopes, private repository failures, unavailable repositories, and fallback to manual schema input.
