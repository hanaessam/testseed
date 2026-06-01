---
name: testseed-core-module
description: Use when adding a new module to packages/core
---

# TestSeed Core Module

Use this workflow:

1. Create a new folder under `packages/core/src/`.
2. Add one `index.ts` per folder.
3. Export one async function from the folder.
4. Define the function signature so all dependencies are parameters.
5. Do not import connection singletons or read environment variables.
6. Write the Jest test file before the implementation.
7. Export the module from `packages/core/src/index.ts`.

The module must not import Express, Next.js, Mongoose, route handlers, or UI code.
