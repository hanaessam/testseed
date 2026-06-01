# `@testseed/db` Agent Guide

Purpose: data access layer, Mongoose only.

Rules:

- Use `createConnection()` as a factory.
- Never create a module-level database singleton.
- Define schemas in model files.
- Export Mongoose models from model files.
- Keep connection strings as function parameters.

Forbidden:

- Business logic in models
- Calls to `@testseed/core`
- Express or Next.js imports
- Stored user connection strings

Models describe persistence shape. Core decides behavior.
