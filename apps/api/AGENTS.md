# `@testseed/api` Agent Guide

Purpose: HTTP interface adapter, Express only.

Rules:

- Routes call `@testseed/core` functions.
- No inline business logic in route handlers.
- Validate every request with Zod before it reaches the handler.
- Middleware order is `auth -> validate -> handler`.
- JWT middleware protects every route except `/auth/*`.
- Connection strings come from request bodies, are passed to core, and are never stored.

Allowed package imports:

- `@testseed/types`
- `@testseed/db`
- `@testseed/core`

Handlers shape HTTP responses. Core decides product behavior.
