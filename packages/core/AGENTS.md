# `@testseed/core` Agent Guide

Purpose: use cases layer, pure TypeScript business behavior.

Rules:

- Create one folder per use case under `packages/core/src/`.
- Export one function per use case folder.
- Keep functions framework-free and adapter-free.
- Test every exported function with Jest.
- Receive all external clients, API keys, and connection strings as function parameters.

Forbidden imports:

- Express
- Next.js
- Mongoose
- Database connection singletons
- App route handlers
- UI modules

- Generation: `saveGeneratedDataset`, `listSavedGeneratedDatasets`, refine/regenerate, `updateSavedGeneratedDataset` (patch saved run).
- Rollback: `rollbackSeedBatch` (MongoDB batch operations).
