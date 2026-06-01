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

Do not put business logic in the handler. Do not store connection strings.
