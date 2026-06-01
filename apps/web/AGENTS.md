# `@testseed/web` Agent Guide

Purpose: UI layer, Next.js only.

Rules:

- The only allowed `@testseed/*` import is `@testseed/types`.
- All API calls go through `src/lib/api-client.ts`.
- Components render state and collect user input.
- Server actions may coordinate UI flow, but must not contain business logic.

Forbidden:

- `@testseed/core` imports
- `@testseed/db` imports
- Database clients
- Business logic in components
- Business logic in server actions

If UI needs behavior, call the API. If API needs behavior, call core.
