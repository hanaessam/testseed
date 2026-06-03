---
name: testseed-api-route
description: Use when adding a new route to apps/api
---

# TestSeed API Route

Use this workflow:

1. Create the route file in `apps/api/src/routes/`.
2. Define the Zod schema for the request body first.
3. Apply middleware in this order: `auth -> validate -> handler`.
4. Make the handler call one `@testseed/core` function.
5. Return a shaped HTTP response.
6. Register the route in `apps/api/src/index.ts`.

Use feature-owned shared contracts from `packages/types`:

- Auth contracts live in `auth.ts`.
- Schema parse contracts live in `schema.ts`.
- Project CRUD, schema snapshot lifecycle, and history contracts live in `projects.ts`.
- Do not add new request/response interfaces to `api.ts`.

For delete routes, support both lifecycle modes when the feature has user-owned persistent records:

- `archive` keeps history and marks records with `archivedAt`.
- `restore` clears archive state and makes archived records visible in active navigation again.
- `hard` removes project-owned records and must be an explicit request body value.

Expose restore as an explicit route such as `PATCH /resource/:id/restore`; do not overload hard-delete or update routes with hidden restore behavior.

Do not put business logic in the handler. Do not store connection strings.
