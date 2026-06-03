---
name: testseed-api-route
description: Use when adding or changing Express routes in apps/api, especially request validation, route mounting, response shaping, or adapter-only HTTP behavior.
---

# TestSeed API Route

Keep API routes as HTTP adapters. They validate input, authenticate, call core use cases, and shape responses.

## Workflow

1. Read root `AGENTS.md`, `apps/api/AGENTS.md`, and `docs/requirements.md`.
2. Define request validation with Zod before the handler.
3. Apply middleware in this order: `auth -> validate -> handler`.
4. Make each handler call the smallest relevant `@testseed/core` function.
5. Return a shaped HTTP response with explicit status codes.
6. Register the router in the API composition entrypoint.
7. Add focused route tests when contracts or failure behavior changes.

## Contracts

- Put feature-owned request/response contracts in `packages/types`.
- Use `auth.ts` for auth contracts, `schema.ts` for schema parsing, and `projects.ts` for project, snapshot, history, and rollback contracts.
- Keep `api.ts` as a compatibility barrel; do not add new feature contracts there.

## Guardrails

- Do not put business logic in route handlers.
- Do not store connection strings, OAuth secrets, SMTP credentials, Redis tokens, or OpenAI keys.
- Do not import Next.js or UI code.
- For persistent user-owned records, expose lifecycle operations clearly: archive, restore, and hard delete.
- Expose restore with an explicit route such as `PATCH /resource/:id/restore`.
