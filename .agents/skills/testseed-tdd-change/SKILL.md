---
name: testseed-tdd-change
description: Use when implementing any TestSeed code, behavior, route, setup, or documentation change that should be developed test-first and kept runnable from README instructions.
---

# TestSeed TDD Change

Use test-first development for behavior changes and keep the monorepo runnable.

## Workflow

1. Read `docs/requirements.md` and relevant `AGENTS.md` files.
2. Identify the smallest behavior change and owning package layer.
3. Write or update the failing test first.
4. Implement only enough code to pass.
5. Refactor within the touched scope.
6. Update README and `.env.example` only when setup or user-visible workflows change.
7. Run `npx turbo build lint test` before handing work back.

## Architecture Rules

- Preserve dependency direction: `packages/types -> packages/db -> packages/core -> apps/api -> apps/web`.
- Keep business logic out of `apps/`.
- Route handlers validate, call core, and shape HTTP responses.
- Web code calls the API client and does not import `@testseed/core` or `@testseed/db`.
- Never store database connection strings or secrets in code, logs, databases, docs, or local files.

## GitHub Auth and Repository Access

- Keep OAuth HTTP exchange details in `apps/api`.
- Put account resolution behavior in `packages/core`.
- Keep user persistence in `packages/db`.
- Expose shared request/response contracts through `packages/types`.
- Treat repository file access as separate from login.
